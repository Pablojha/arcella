import multer from 'multer';
import { env } from '../config/env.js';

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'That file is too large',
  LIMIT_FILE_COUNT: 'Too many files',
  LIMIT_UNEXPECTED_FILE: 'Too many files selected',
};

export const notFound = (req, res) => res.status(404).json({ message: 'Route not found' });

export function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let { message } = err;
  if (err instanceof multer.MulterError) [status, message] = [400, MULTER_MESSAGES[err.code] || err.message];
  else if (err.name === 'CastError') [status, message] = [400, 'Invalid id or value'];
  else if (err.name === 'ValidationError') status = 400;
  else if (err.code === 11000) [status, message] = [409, 'That already exists'];
  if (status >= 500) {
    console.error(err);
    if (env.isProd) message = 'Something went wrong on our side. Please try again.';
  }
  if (res.headersSent) return next(err);
  res.status(status).json({ message });
}
