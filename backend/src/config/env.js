try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the host's environment variables (Render, CI).
}

const list = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean);
const { env: e } = process;
const clientUrls = list(e.CLIENT_URL || 'http://localhost:5173');

export const env = {
  port: Number(e.PORT) || 5000,
  isProd: e.NODE_ENV === 'production',
  mongoUri: e.MONGODB_URI || 'mongodb://127.0.0.1:27017/arcella',
  jwtSecret: e.JWT_SECRET || 'dev-only-secret',
  jwtExpires: e.JWT_EXPIRES || '30d',
  /** The first CLIENT_URL is where emailed links (password reset) point. */
  appUrl: clientUrls[0],
  clientUrls: [...clientUrls, 'capacitor://localhost', 'https://localhost'],
  uploadDir: e.UPLOAD_DIR,
  adminEmails: list(e.ADMIN_EMAIL).map((email) => email.toLowerCase()),
  cloudinary: { cloud_name: e.CLOUDINARY_CLOUD_NAME, api_key: e.CLOUDINARY_API_KEY, api_secret: e.CLOUDINARY_API_SECRET },
  mailFrom: e.MAIL_FROM || 'Arcella <no-reply@arcella.app>',
  resendKey: e.RESEND_API_KEY,
  smtp: { host: e.SMTP_HOST, port: Number(e.SMTP_PORT) || 587, user: e.SMTP_USER, pass: e.SMTP_PASS },
};

if (env.isProd && !e.JWT_SECRET) throw new Error('JWT_SECRET must be set in production');
