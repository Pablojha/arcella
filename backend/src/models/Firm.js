import { Schema, model } from 'mongoose';
import { FIRM_SIZES } from '../config/constants.js';
import { ref } from './types.js';

const firmSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    logo: String,
    cover: String,
    about: String,
    size: { type: String, enum: FIRM_SIZES },
    city: String,
    website: String,
    gallery: [String],
    owner: ref('User', { required: true }),
    team: [ref('User')],
    followers: [ref('User')],
  },
  { timestamps: true },
);

export default model('Firm', firmSchema);
