import { Schema, model } from 'mongoose';
import { ref } from './types.js';

/** A member looking at someone's profile, counted once a day per viewer and kept for 90 days. */
const profileViewSchema = new Schema({
  viewer: ref('User', { required: true }),
  viewed: ref('User', { required: true }),
  day: { type: String, required: true },
  at: { type: Date, default: Date.now },
});

profileViewSchema.index({ viewed: 1, day: 1, viewer: 1 }, { unique: true });
profileViewSchema.index({ viewer: 1 });
profileViewSchema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default model('ProfileView', profileViewSchema);
