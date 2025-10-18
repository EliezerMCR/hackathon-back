import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const parseBoolean = (value: string | undefined) => {
  if (value === undefined) return undefined;
  return value.toLowerCase() === 'true';
};

const buildTransportConfig = (): SMTPTransport.Options => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be configured to send emails');
  }

  const service = process.env.EMAIL_SERVICE;
  if (service) {
    const serviceConfig: SMTPTransport.Options = {
      service,
      auth: { user, pass },
    };
    return serviceConfig;
  }

  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;

  if (host) {
    const secureEnv = parseBoolean(process.env.EMAIL_SECURE);
    const secure = secureEnv ?? port === 465;

    const hostConfig: SMTPTransport.Options = {
      host,
      port: port ?? 587,
      secure,
      auth: { user, pass },
    };
    return hostConfig;
  }

  throw new Error(
    'Email transport is not configured. Set EMAIL_SERVICE or EMAIL_HOST/EMAIL_PORT environment variables.',
  );
};

let transporter: nodemailer.Transporter | undefined;

const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    const config = buildTransportConfig();
    transporter = nodemailer.createTransport(config);
  }
  return transporter;
};

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

export const sendEmail = async (mailOptions: MailOptions) => {
  try {
    const mailTransporter = getTransporter();
    const fromAddress = mailOptions.from ?? process.env.EMAIL_FROM ?? process.env.EMAIL_USER;

    await mailTransporter.sendMail({
      ...mailOptions,
      from: fromAddress,
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(error instanceof Error ? error.message : 'Error sending email');
  }
};
