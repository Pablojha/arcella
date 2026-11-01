import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const notificationSchema = new Schema(
  {
    user: ref('User', { required: true }),
    actor: ref('User'),
    type: { type: String, required: true },
    text: String,
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, _id: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export default model('Notification', notificationSchema);
