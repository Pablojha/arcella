import { Schema, model } from 'mongoose';

/** One live 6-digit code per email and purpose; MongoDB deletes it when it expires. */
const otpSchema = new Schema({
  email: { type: String, required: true, lowercase: true },
  purpose: { type: String, enum: ['signup', 'reset', 'college'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

export default model('Otp', otpSchema);
