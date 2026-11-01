import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const answerSchema = new Schema(
  {
    question: ref('Question', { required: true, index: true }),
    author: ref('User', { required: true }),
    body: { type: String, required: true },
    upvotes: [ref('User')],
    votes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default model('Answer', answerSchema);
