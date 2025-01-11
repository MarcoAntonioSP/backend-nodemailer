const rateLimit = require('express-rate-limit');
const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 3006;

// Configuração CORS para múltiplas origens
const allowedOrigins = ['http://localhost:3000', 'https://www.lccopper.com'];
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Limitação de tentativas de Captcha por IP
const captchaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limita a 5 tentativas de obter uma pergunta de captcha por IP
  message: 'Muitas requisições para o Captcha, tente novamente mais tarde.',
});

// Limitação de envio de e-mails por IP
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 2, // Limita a 2 envios de e-mails por IP por hora
  message: 'Você atingiu o limite de envio de e-mails (2) por hora. Tente novamente em uma hora.',
  statusCode: 429, // Status HTTP para limite atingido
  handler: (req, res, /*next*/) => {
    res.status(429).send({
      error: 'Você atingiu o limite de envio de e-mails (2) por hora. Tente novamente em uma hora.',
    });
  },
});

// Aplicar as limitações nos respectivos endpoints
app.use('/captcha', captchaLimiter); // Limitar tentativas de Captcha
app.use('/send', emailLimiter); // Limitar envios de e-mails

// Perguntas e respostas armazenadas como variáveis de ambiente
const questions = process.env.CAPTCHA_QUESTIONS.split('|').map(q => {
  const [question, answer] = q.split(';');
  return { question, answer };
});

app.get('/', (req, res) => {
  res.send('teste rota get');
});

// Endpoint para obter uma pergunta aleatória do captcha
app.get('/captcha', (req, res) => {
  const randomIndex = Math.floor(Math.random() * questions.length);
  const question = questions[randomIndex];
  res.send({ question: question.question, id: randomIndex });
});

app.post('/send', (req, res) => {
  const { name, company, email, phone, message, captchaId, captchaAnswer } = req.body;

  // Validar resposta do captcha
  const correctAnswer = questions[captchaId]?.answer;
  if (!correctAnswer || captchaAnswer !== correctAnswer) {
    return res.status(400).send({ error: 'Captcha inválido' });
  }

  // Configurar credenciais de envio com base na origem
  let smtpUser;
  let smtpPass;
  let toEmail;
  const origin = req.get('origin');
  if (origin === 'http://localhost:3000') {
    smtpUser = process.env.LOCALHOST_USER_EMAIL;
    smtpPass = process.env.LOCALHOST_USER_PASSWORD;
    toEmail = process.env.LOCALHOST_TO_EMAIL;
  } else if (origin === 'https://www.lccopper.com') {
    smtpUser = process.env.LCCOPPER_USER_EMAIL;
    smtpPass = process.env.LCCOPPER_USER_PASSWORD;
    toEmail = process.env.LCCOPPER_TO_EMAIL;
  } else {
    return res.status(400).send({ error: 'Invalid origin' });
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
    res.send(info);
  }).catch(error => {
    res.status(500).send(error);
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
