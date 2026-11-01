import { Schema, model } from 'mongoose';
import { CRITERIA } from '../config/constants.js';
import { ref } from './types.js';

const score = { type: Number, min: 1, max: 5, required: true };

const critiqueSchema = new Schema(
  {
    project: ref('Project', { required: true }),
    author: ref('User', { required: true }),
    scores: Object.fromEntries(CRITERIA.map((criterion) => [criterion, score])),
    comment: String,
  },
  { timestamps: true },
);

critiqueSchema.index({ project: 1, author: 1 }, { unique: true });

export default model('Critique', critiqueSchema);
