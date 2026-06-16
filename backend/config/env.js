// Single source of truth for all environment variables.
// Every module imports from here — never from process.env directly.

module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGO_URI: process.env.MONGO_URI,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '30d',

  // Email
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,

  // Termii SMS
  TERMII_API_KEY: process.env.TERMII_API_KEY,
  TERMII_SENDER_ID: process.env.TERMII_SENDER_ID,
  TERMII_BASE_URL: process.env.TERMII_BASE_URL,

  // Paystack
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,

  // AI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,

  // App
  CLIENT_URL: process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://smartschool-app.onrender.com' : 'http://localhost:5173'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'src/uploads',
};

// Production Guard
if (module.exports.NODE_ENV === 'production' && module.exports.CLIENT_URL.includes('localhost')) {
  throw new Error('Invalid production CLIENT_URL: localhost detected. Please define CLIENT_URL in environment variables.');
}