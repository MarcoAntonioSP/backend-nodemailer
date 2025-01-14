const rateLimit = require('express-rate-limit');
const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 3001;

// Configuração CORS consolidada
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3000/',
  'https://www.lccopper.com',
  'https://template-nextjs-flowbite-tailwind.vercel.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Permite a origem
    } else {
      callback(new Error('Not allowed by CORS')); // Bloqueia a origem
    }
  },
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Middleware para parsing do corpo da requisição
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Limitação de envio de e-mails por IP
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 2, // Limite: 2 envios de e-mails por hora
  message: 'Você atingiu o limite de envio de e-mails (2) por hora. Tente novamente em uma hora.',
  statusCode: 429,
});

app.use('/send', emailLimiter);
app.set('trust proxy', 1); // Adicione esta linha

app.get('/', (req, res) => {
  res.send('API para gestão de formulários de e-mail.');
});

// Endpoint para envio de e-mails (sem CAPTCHA)
app.post('/send', (req, res) => {
  const { name, company, email, phone, message } = req.body;

  const origin = req.get('origin');
  console.log('Origem recebida:', origin); // Log para depuração
  let smtpUser, smtpPass, toEmail;

  if (origin === 'http://localhost:3000') {
    smtpUser = process.env.LOCALHOST_USER_EMAIL;
    smtpPass = process.env.LOCALHOST_USER_PASSWORD;
    toEmail = process.env.LOCALHOST_TO_EMAIL;
  } else if (origin === 'https://www.lccopper.com') {
    smtpUser = process.env.LCCOPPER_USER_EMAIL;
    smtpPass = process.env.LCCOPPER_USER_PASSWORD;
    toEmail = process.env.LCCOPPER_TO_EMAIL;
  } else if (origin === 'https://template-nextjs-flowbite-tailwind.vercel.app') {
    smtpUser = process.env.TEMPLATE_USER_EMAIL;
    smtpPass = process.env.TEMPLATE_USER_PASSWORD;
    toEmail = process.env.TEMPLATE_TO_EMAIL;
  } else {
    return res.status(400).json({ error: 'Origem inválida' });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.umbler.com",
    port: 587,
    auth: { user: smtpUser, pass: smtpPass },
  });

  transporter.sendMail({
    from: smtpUser,
    to: toEmail,
    replyTo: email,
    subject: `Contato de ${name} - ${company}`,
    text: `Nome: ${name}\nEmpresa: ${company}\nE-mail: ${email}\nTelefone: ${phone}\n\nMensagem:\n${message}`,
  }).then(info => {
    res.json({ success: true, info });
  }).catch(error => {
    console.error('Erro ao enviar o e-mail:', error);
    res.status(500).json({ error: 'Erro ao enviar o e-mail.' });
  });
});

module.exports = app;
