import { Schema, model } from 'mongoose';
import { PROJECT_CATEGORIES } from '../config/constants.js';
import { ref } from './types.js';

const projectSchema = new Schema(
  {
    owner: ref('User', { required: true, index: true }),
    title: { type: String, required: true, trim: true },
    description: String,
    category: { type: String, enum: PROJECT_CATEGORIES, default: 'Other' },
    year: Number,
    site: String,
    tools: [String],
    images: { type: [String], required: true },
    appreciations: [ref('User')],
    critiqueOpen: { type: Boolean, default: false },
    critiquePrompt: String,
  },
  { timestamps: true },
);

projectSchema.index({ category: 1, _id: -1 });

export default model('Project', projectSchema);
