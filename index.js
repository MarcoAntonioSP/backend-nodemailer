const rateLimit = require("express-rate-limit");
const express = require("express");
const app = express();
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 3001;

// Configuração CORS para múltiplas origens
const allowedOrigins = [
  "http://localhost:3000",
  "https://www.lccopper.com",
  "https://template-nextjs-flowbite-tailwind.vercel.app",
  "https://template-nextjs-flo-git-f7b41a-marco-antonios-projects-796d869d.vercel.app", // Adicione este domínio
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Permite cookies e cabeçalhos de autenticação
  optionsSuccessStatus: 200,
};
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.options("*", cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Limitação de tentativas de Captcha por IP
const captchaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limita a 5 tentativas de obter uma pergunta de captcha por IP
  message: "Muitas requisições para o Captcha, tente novamente mais tarde.",
});

// Limitação de envio de e-mails por IP
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 2, // Limita a 2 envios de e-mails por IP por hora
  message:
    "Você atingiu o limite de envio de e-mails (2) por hora. Tente novamente em uma hora.",
  statusCode: 429, // Status HTTP para limite atingido
  handler: (req, res /*next*/) => {
    res.status(429).send({
      error:
        "Você atingiu o limite de envio de e-mails (2) por hora. Tente novamente em uma hora.",
    });
  },
});

// Aplicar as limitações nos respectivos endpoints
app.use("/captcha", captchaLimiter); // Limitar tentativas de Captcha
app.use("/send", emailLimiter); // Limitar envios de e-mails

// Perguntas e respostas armazenadas como variáveis de ambiente
const questions = process.env.CAPTCHA_QUESTIONS.split("|").map((q) => {
  const [question, answer] = q.split(";");
  return { question, answer };
});

app.get("/", (req, res) => {
  res.send("Api para gestão de formularios de email");
});

// Endpoint para obter uma pergunta aleatória do captcha
app.get("/captcha", (req, res) => {
  const randomIndex = Math.floor(Math.random() * questions.length);
  const question = questions[randomIndex];
  res.send({ question: question.question, id: randomIndex });
});

app.post("/send", (req, res) => {
  const { name, company, email, phone, message, captchaId, captchaAnswer } =
    req.body;

  // Validação de campos obrigatórios
  if (!name || !email || !message || !captchaId || !captchaAnswer) {
    return res.status(400).send({ error: "Todos os campos são obrigatórios." });
  }

  // Validar resposta do captcha
  const correctAnswer = questions[captchaId]?.answer;
  if (!correctAnswer || captchaAnswer !== correctAnswer) {
    return res.status(400).send({ error: "Captcha inválido" });
  }

  // Configurar credenciais de envio com base na origem
  let smtpUser, smtpPass, toEmail;
  const origin = req.get("origin");
  if (origin === "http://localhost:3000") {
    smtpUser = process.env.LOCALHOST_USER_EMAIL;
    smtpPass = process.env.LOCALHOST_USER_PASSWORD;
    toEmail = process.env.LOCALHOST_TO_EMAIL;
  } else if (origin === "https://www.lccopper.com") {
    smtpUser = process.env.LCCOPPER_USER_EMAIL;
    smtpPass = process.env.LCCOPPER_USER_PASSWORD;
    toEmail = process.env.LCCOPPER_TO_EMAIL;
  } else {
    return res.status(400).send({ error: "Origem inválida" });
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
      console.log("E-mail enviado com sucesso:", info);
      res.send(info);
    })
    .catch((error) => {
      console.error("Erro ao enviar e-mail:", error);
      res
        .status(500)
        .send({
          error: "Erro ao enviar o e-mail. Tente novamente mais tarde.",
        });
    });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
// Exporte a função para o Vercel
module.exports = app;
