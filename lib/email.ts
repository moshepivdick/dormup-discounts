import nodemailer from 'nodemailer';

type UpgradeEmailPayload = {
  venueName: string;
  toTier: string;
  fromTier: string;
  note?: string | null;
  partnerEmail?: string | null;
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const sendUpgradeRequestEmail = async (payload: UpgradeEmailPayload) => {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, reason: 'not_configured' as const };
  }

  const to = process.env.UPGRADE_EMAIL_TO || 'dormup.it@gmail.com';
  const from = process.env.UPGRADE_EMAIL_FROM || process.env.SMTP_USER || 'no-reply@dormup.it';
  const subject = `Upgrade request: ${payload.venueName} → ${payload.toTier}`;
  const noteText = payload.note?.trim() ? payload.note.trim() : 'No note provided';
  const text = [
    `Venue: ${payload.venueName}`,
    `From: ${payload.fromTier}`,
    `To: ${payload.toTier}`,
    payload.partnerEmail ? `Partner: ${payload.partnerEmail}` : null,
    `Note: ${noteText}`,
  ]
    .filter(Boolean)
    .join('\n');

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  return { ok: true as const };
};
