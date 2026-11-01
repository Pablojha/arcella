import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const collegeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    short: String,
    city: String,
    state: String,
    domains: [{ type: String, lowercase: true, trim: true }],
    admin: ref('User'),
    coAdmin: ref('User'),
    userAdded: { type: Boolean, default: false },
    addedBy: ref('User'),
  },
  { timestamps: true },
);

/** True when the address belongs to one of the official domains (subdomains included). */
collegeSchema.methods.allowsEmail = function allowsEmail(email) {
  const host = email.split('@')[1]?.toLowerCase() ?? '';
  return this.domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
};

export default model('College', collegeSchema);
