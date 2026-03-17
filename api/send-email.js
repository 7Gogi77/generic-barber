/**
 * Vercel Serverless Function — Email Notification Proxy
 * Sends appointment emails via SMTP (nodemailer).
 *
 * POST /api/send-email
 * Body: { to, subject, html, text }
 *
 * Environment variables required (set in Vercel dashboard):
 *   SMTP_HOST     — SMTP server (e.g. smtp.gmail.com)
 *   SMTP_PORT     — SMTP port (587 for TLS, 465 for SSL)
 *   SMTP_USER     — SMTP username / email
 *   SMTP_PASS     — SMTP password / app password
 *   SMTP_FROM     — From address shown to recipient (e.g. "Salon <noreply@example.com>")
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return res.status(500).json({ success: false, error: 'SMTP not configured' });
  }

  const { to, subject, html, text } = req.body || {};
  if (!to || (!html && !text)) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, and html or text' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587', 10),
      secure: parseInt(SMTP_PORT || '587', 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject: subject || 'Obvestilo',
      text: text || '',
      html: html || '',
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export const config = { maxDuration: 15 };
