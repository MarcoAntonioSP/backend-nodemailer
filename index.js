const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
require('dotenv').config();

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  message: 'Você atingiu o limite de envio de e-mails. Tente novamente em 1 hora.',
  statusCode: 429,
});

const smtpConfig = {
  'http://localhost:3000': { user: process.env.LOCALHOST_USER_EMAIL, pass: process.env.LOCALHOST_USER_PASSWORD, toEmail: process.env.LOCALHOST_TO_EMAIL },
  'https://www.lccopper.com': { user: process.env.LCCOPPER_USER_EMAIL, pass: process.env.LCCOPPER_USER_PASSWORD, toEmail: process.env.LCCOPPER_TO_EMAIL },
  'https://template-nextjs-flowbite-tailwind.vercel.app': { user: process.env.VERCEL_USER_EMAIL, pass: process.env.VERCEL_USER_PASSWORD, toEmail: process.env.VERCEL_TO_EMAIL },
};

module.exports = (req, res) => {
  if (req.method === 'POST') {
    const { name, company, email, phone, message, captchaId, captchaAnswer } = req.body;

    // Validação da resposta do Captcha
    if (!questions[captchaId] || questions[captchaId].answer !== captchaAnswer) {
      return res.status(400).json({ error: 'Resposta do Captcha inválida' });
    }

    // Configuração SMTP com base na origem
    const origin = req.headers.origin;
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
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
};
