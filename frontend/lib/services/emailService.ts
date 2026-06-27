import nodemailer from "nodemailer";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"IZA POS" <${user}>`;

  // If credentials are not configured, log to console as fallback (simulation)
  if (!user || !pass) {
    console.warn(
      `[EMAIL SIMULATION] SMTP credentials missing. Could not send real email to ${to}.\n` +
      `Subject: ${subject}\n` +
      `Content: (HTML body omitted, please check dev console for links)`
    );
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] Message sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send email via SMTP:", error);
    return false;
  }
}
