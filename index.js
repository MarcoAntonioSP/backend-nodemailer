const rateLimit = require('express-rate-limit');
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Configuração CORS consolidada
const allowedOrigins = [
  'http://localhost:3000',
  'https://www.lccopper.com',
  'https://template-nextjs-flowbite-tailwind.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Permite a origem
    } else {
      callback(new Error('Not allowed by CORS')); // Bloqueia a origem
    }
  },
  methods: 'GET,POST',
  allowedHeaders: 'Content-Type,Authorization',
  optionsSuccessStatus: 200,
}));

// Middleware para parsing do corpo da requisição
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Limitação de tentativas de Captcha e envio de e-mails por IP
const captchaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: 'Muitas tentativas de Captcha. Tente novamente em breve.',
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  message: 'Você atingiu o limite de envio de e-mails. Tente novamente em 1 hora.',
  statusCode: 429,
});

app.use('/captcha', captchaLimiter);
app.use('/send', emailLimiter);

// Perguntas do Captcha (carregadas de variáveis de ambiente)
const questions = process.env.CAPTCHA_QUESTIONS.split('|').map(q => {
  const [question, answer] = q.split(';');
  return { question, answer };
});

// Endpoint para obter uma pergunta do Captcha
app.get('/captcha', (req, res) => {
  const randomIndex = Math.floor(Math.random() * questions.length);
  res.json({ question: questions[randomIndex].question, id: randomIndex });
});

// Endpoint para envio de e-mails
app.post('/send', (req, res) => {
  const { name, company, email, phone, message, captchaId, captchaAnswer } = req.body;
  
  // Validação da resposta do Captcha
  if (questions[captchaId]?.answer !== captchaAnswer) {
    return res.status(400).json({ error: 'Resposta do Captcha inválida' });
  }

  // Configuração SMTP com base na origem
  const origin = req.get('origin');
  const smtpConfig = {
    'http://localhost:3000': { user: process.env.LOCALHOST_USER_EMAIL, pass: process.env.LOCALHOST_USER_PASSWORD, toEmail: process.env.LOCALHOST_TO_EMAIL },
    'https://www.lccopper.com': { user: process.env.LCCOPPER_USER_EMAIL, pass: process.env.LCCOPPER_USER_PASSWORD, toEmail: process.env.LCCOPPER_TO_EMAIL },
    'https://template-nextjs-flowbite-tailwind.vercel.app': { user: process.env.VERCEL_USER_EMAIL, pass: process.env.VERCEL_USER_PASSWORD, toEmail: process.env.VERCEL_TO_EMAIL },
  };

  const config = smtpConfig[origin];
  if (!config) {
    return res.status(400).json({ error: 'Origem inválida' });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.umbler.com",
    port: 587,
    auth: { user: config.user, pass: config.pass },
  });

  const mailOptions = {
    from: config.user,
    to: config.toEmail,
    replyTo: email,
    subject: `Contato de ${name} - ${company}`,
    text: `Nome: ${name}\nEmpresa: ${company}\nE-mail: ${email}\nTelefone: ${phone}\n\nMensagem:\n${message}`,
  };

  transporter.sendMail(mailOptions)
    .then(info => res.json({ success: true, info }))
    .catch(error => {
      console.error('Erro ao enviar o e-mail:', error);
      res.status(500).json({ error: 'Erro ao enviar o e-mail.' });
    });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
