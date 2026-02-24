import nodemailer from "nodemailer";

// Creación lazy del transporter para que las env vars ya estén cargadas
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Envía el código de recuperación al email del usuario
 * @param {string} email - Email destino
 * @param {string} code - Código de 6 dígitos
 */
export const sendResetCode = async (email, code) => {
  await getTransporter().sendMail({
    from: `"Marketplace" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Código de recuperación de contraseña",
    html: `
      <h2>Recuperación de contraseña</h2>
      <p>Tu código de verificación es:</p>
      <h1 style="letter-spacing: 8px; color: #4F46E5;">${code}</h1>
      <p>Este código expira en <strong>15 minutos</strong>.</p>
      <p>Si no solicitaste este código ignora este mensaje.</p>
    `,
  });
};
