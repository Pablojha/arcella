import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const { host, port, user, pass } = env.smtp;
const smtp = host && nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined });

export const mailConfigured = Boolean(env.resendKey || smtp);

async function sendWithResend(message) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (!res.ok) throw new ApiError(502, 'We could not send the email right now. Please try again.');
}

/** Sends an email through Resend or SMTP. Returns false when no provider is configured. */
export async function sendMail({ to, subject, html }) {
  const message = { from: env.mailFrom, to, subject, html };
  if (env.resendKey) await sendWithResend(message);
  else if (smtp) await smtp.sendMail(message);
  else return false;
  return true;
}

const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export const codeEmail = (code, intro) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:440px;margin:auto;padding:32px;background:#f7f5f0;color:#1a1918">
    <h2 style="margin:0 0 8px;color:#1d6b47">arcella.</h2>
    <p>${escapeHtml(intro)}</p>
    <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:24px 0">${code}</p>
    <p style="color:#6f6a61;font-size:13px">It expires in 10 minutes. If you did not request it, you can ignore this email.</p>
  </div>`;
