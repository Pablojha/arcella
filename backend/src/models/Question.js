import { Schema, model } from 'mongoose';
import { SUBJECTS } from '../config/constants.js';
import { ref } from './types.js';

const questionSchema = new Schema(
  {
    author: ref('User', { required: true }),
    title: { type: String, required: true, trim: true },
    body: String,
    subject: { type: String, enum: SUBJECTS, required: true },
    upvotes: [ref('User')],
    votes: { type: Number, default: 0 },
    answersCount: { type: Number, default: 0 },
    accepted: ref('Answer', { default: null }),
  },
  { timestamps: true },
);

questionSchema.index({ subject: 1, _id: -1 });
questionSchema.index({ votes: -1, _id: -1 });

export default model('Question', questionSchema);
