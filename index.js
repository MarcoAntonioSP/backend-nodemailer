const rateLimit = require("express-rate-limit");
const express = require("express");
const app = express();
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://template-nextjs-flowbite-tailwind.vercel.app',
    'https://www.lccopper.com',
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));


app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  message:
    "Limite de envio de e-mails atingido! Por favor, aguarde 1 hora antes de tentar novamente.",
  statusCode: 429,
});

app.get("/", (req, res) => {
  res.send("API para gestão de formulários de e-mail.");
});

app.post("/send", emailLimiter, (req, res) => {
  const { name, company, email, phone, message } = req.body;

  if (
    !name ||
    !email ||
    !message ||
    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) ||
    !/^\(?([0-9]{2})\)?[-. ]?([0-9]{4,5})[-. ]?([0-9]{4})$/.test(phone)
  ) {
    return res.status(400).json({
      error:
        "Dados inválidos. Por favor, verifique o nome, e-mail, telefone e mensagem.",
    });
  }

  const origin = req.get("origin");
  let smtpUser, smtpPass, toEmail;

  if (origin === "https://template-nextjs-flowbite-tailwind.vercel.app") {
    smtpUser = process.env.LOCALHOST_USER_EMAIL;
    smtpPass = process.env.LOCALHOST_USER_PASSWORD;
    toEmail = process.env.LOCALHOST_TO_EMAIL;
  } else if (origin === "http://localhost:3000") {
    smtpUser = process.env.LCCOPPER_USER_EMAIL;
    smtpPass = process.env.LCCOPPER_USER_PASSWORD;
    toEmail = process.env.LCCOPPER_TO_EMAIL;
  } else {
    return res.status(400).json({ error: "Origem inválida" });
  }

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
      error: "Erro interno. Por favor, tente novamente mais tarde.",
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
        error:
          "Erro ao enviar o e-mail. Por favor, tente novamente mais tarde. (Código de erro: " +
          error.code +
          ")",
      });
    });
});

const PORT = process.env.PORT || 3001;

module.exports = app;
