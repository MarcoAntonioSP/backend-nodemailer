import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 2,
  message: 'Você atingiu o limite de envio de e-mails (2) por hora. Tente novamente em uma hora.',
  statusCode: 429,
});

const allowedOrigins = [
  'http://localhost:3000',
  'https://www.lccopper.com',
  'https://template-nextjs-flowbite-tailwind.vercel.app',
];

export default async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Lidar com a requisição OPTIONS (CORS)
  }

  // Verificar o CORS
  const origin = req.headers.origin;
  if (!allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }

  // Aplicando o rate limiting manualmente
  if (emailLimiter(req, res, () => {})) {
    return;
  }

  const { name, company, email, phone, message } = req.body;

  // Pega as credenciais dependendo da origem
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
    host: 'smtp.umbler.com',
    port: 587,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: smtpUser,
      to: toEmail,
      replyTo: email,
      subject: `Contato de ${name} - ${company}`,
      text: `Nome: ${name}\nEmpresa: ${company}\nE-mail: ${email}\nTelefone: ${phone}\n\nMensagem:\n${message}`,
    });
    return res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return res.status(500).json({ error: 'Erro ao enviar o e-mail.' });
  }
};
