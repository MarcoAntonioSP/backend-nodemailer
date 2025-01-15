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

// Adicionando a configuração para lidar com requisições OPTIONS (preflight)
app.options("*", cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Limitar o envio de e-mails por IP
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Limitar a 3 requisições por IP em 1 hora
  keyGenerator: (req) => req.ip, // Usa o IP do cliente como chave para limitar
  handler: (req, res) => {
    res.status(429).json({
      message: "Limite de envio de e-mails atingido! Por favor, aguarde 1 hora antes de tentar novamente.",
    });
  },
});

// Rota para a página inicial da API
app.get("/", (req, res) => {
  res.send("API para gestão de formulários de e-mail.");
});

// Rota para envio de e-mail
app.post("/send", emailLimiter, async (req, res) => {
  const { name, company, email, phone, message } = req.body;

  try {
    // Validação dos dados recebidos
    if (
      !name ||
      !email ||
      !message ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) ||
      !/^\(?([0-9]{2})\)?[-. ]?([0-9]{4,5})[-. ]?([0-9]{4})$/.test(phone)
    ) {
      return res.status(400).json({
        error: "Dados inválidos. Por favor, verifique o nome, e-mail, telefone e mensagem.",
      });
    }

    const origin = req.get("origin");
    let smtpUser, smtpPass, toEmail;

    // Configuração de credenciais SMTP com base na origem da requisição
    if (origin === "http://localhost:3000") {
      smtpUser = process.env.LOCALHOST_USER_EMAIL;
      smtpPass = process.env.LOCALHOST_USER_PASSWORD;
      toEmail = process.env.LOCALHOST_TO_EMAIL;
    } else if (origin === "https://template-nextjs-flowbite-tailwind.vercel.app") {
      smtpUser = process.env.LCCOPPER_USER_EMAIL;
      smtpPass = process.env.LCCOPPER_USER_PASSWORD;
      toEmail = process.env.LCCOPPER_TO_EMAIL;
    } else {
      return res.status(400).json({ error: "Origem inválida" });
    }

    if (!smtpUser || !smtpPass || !toEmail) {
      return res.status(500).json({
        error: "Erro interno. Por favor, tente novamente mais tarde. (Credenciais SMTP inválidas)",
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.umbler.com",
      port: 587,
      auth: { user: smtpUser, pass: smtpPass },
    });

    // Envio do e-mail
    const info = await transporter.sendMail({
      from: smtpUser,
      to: toEmail,
      replyTo: email,
      subject: `Contato de ${name} - ${company}`,
      text: `Nome: ${name}\nEmpresa: ${company}\nE-mail: ${email}\nTelefone: ${phone}\n\nMensagem:\n${message}`,
    });

    res.json({ success: true, info });
  } catch (error) {
    // Tratamento de erro de envio de e-mail
    console.error("Erro ao enviar o e-mail:", error);
    if (error.code === 'ENOTFOUND') {
      return res.status(500).json({
        error: "Erro de rede ao tentar enviar o e-mail. Por favor, tente novamente mais tarde.",
      });
    }
    res.status(500).json({
      error: `Erro ao enviar o e-mail. Por favor, tente novamente mais tarde. (Código de erro: ${error.code})`,
    });
  }
});

// Middleware global de captura de erros (última linha)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Erro interno do servidor. Por favor, tente novamente mais tarde.",
  });
});

const PORT = process.env.PORT || 3001;


module.exports = app;
