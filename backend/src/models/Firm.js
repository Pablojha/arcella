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
    // People the owner trusts to post roles and see applicants. `team` is self-declared ("I work here"), so it grants nothing.
    admins: [ref('User')],
    team: [ref('User')],
    followers: [ref('User')],
    // Checked by Arcella's admins.
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default model('Firm', firmSchema);
