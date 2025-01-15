const rateLimit = require("express-rate-limit");
const express = require("express");
const app = express();
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://template-nextjs-flowbite-tailwind.vercel.app",
    "https://www.lccopper.com",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Adicione esta rota para lidar explicitamente com requisições OPTIONS (preflight)
app.options("*", cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Limitar o envio de e-mails por IP
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Limitar a 3 requisições por IP em 1 hora
  keyGenerator: (req) => req.ip, // Usa o IP do cliente como chave para limitar
  handler: (req, res, next) => {
    res.status(429).json({
      message: "Limite de envio de e-mails atingido! Por favor, aguarde 1 hora antes de tentar novamente.",
    });
  },
});

app.get("/", (req, res) => {
  res.send("API para gestão de formulários de e-mail.");
});

app.post("/send", emailLimiter, (req, res) => {
  const { name, company, email, phone, message } = req.body;

  // Validação dos campos obrigatórios
  if (!name) {
    return res.status(400).json({
      error: "O campo 'nome' é obrigatório.",
    });
  }

  if (!email) {
    return res.status(400).json({
      error: "O campo 'e-mail' é obrigatório.",
    });
  }

  if (!message) {
    return res.status(400).json({
      error: "O campo 'mensagem' é obrigatório.",
    });
  }

  // Validação do formato do e-mail
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return res.status(400).json({
      error: "O e-mail fornecido é inválido. Por favor, verifique o e-mail inserido.",
    });
  }

  // Validação do formato do telefone
  if (phone && !/^\(?([0-9]{2})\)?[-. ]?([0-9]{4,5})[-. ]?([0-9]{4})$/.test(phone)) {
    return res.status(400).json({
      error: "O telefone fornecido é inválido. Por favor, verifique o telefone inserido.",
    });
  }

  const origin = req.get("origin");
  let smtpUser, smtpPass, toEmail;

  // Verificação da origem da requisição
  if (origin === "http://localhost:3000") {
    smtpUser = process.env.LOCALHOST_USER_EMAIL;
    smtpPass = process.env.LOCALHOST_USER_PASSWORD;
    toEmail = process.env.LOCALHOST_TO_EMAIL;
  } else if (
    origin === "https://template-nextjs-flowbite-tailwind.vercel.app"
  ) {
    smtpUser = process.env.LCCOPPER_USER_EMAIL;
    smtpPass = process.env.LCCOPPER_USER_PASSWORD;
    toEmail = process.env.LCCOPPER_TO_EMAIL;
  } else {
    return res.status(400).json({ error: "Origem inválida. A solicitação deve ser feita a partir de um domínio autorizado." });
  }

  // Verificação das credenciais SMTP
  if (
    !smtpUser ||
    !smtpPass ||
    !toEmail ||
    typeof smtpUser !== "string" ||
    typeof smtpPass !== "string" ||
    typeof toEmail !== "string"
  ) {
    console.error("Credenciais SMTP inválidas para a origem:", origin);
    return res.status(500).json({
      error: "Erro interno no servidor. Não foi possível configurar as credenciais de envio de e-mails.",
    });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.umbler.com",
    port: 587,
    auth: { user: smtpUser, pass: smtpPass },
  });

  transporter
    .sendMail({
      from: smtpUser,
      to: toEmail,
      replyTo: email,
      subject: `Contato de ${name} - ${company}`,
      text: `Nome: ${name}\nEmpresa: ${company}\nE-mail: ${email}\nTelefone: ${phone}\n\nMensagem:\n${message}`,
    })
    .then((info) => {
      res.json({ success: true, info });
    })
    .catch((error) => {
      console.error("Erro ao enviar o e-mail:", error);
      return res.status(500).json({
        error: `Erro ao enviar o e-mail. Por favor, tente novamente mais tarde. (Código de erro: ${error.code})`,
      });
    });
});

const PORT = process.env.PORT || 3001;

module.exports = app;
