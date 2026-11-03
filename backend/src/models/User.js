import { Schema, model } from 'mongoose';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import { COLLEGE_ROLES, USER_TYPES } from '../config/constants.js';
import { randomSlug } from '../utils/text.js';
import { ref } from './types.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    password: { type: String, required: true, select: false },
    type: { type: String, enum: USER_TYPES, default: 'student' },
    isAdmin: { type: Boolean, default: false },
    avatar: String,
    cover: String,
    headline: String,
    bio: String,
    location: String,
    website: String,
    software: [String],
    skills: [String],
    experience: [{ title: String, org: String, start: String, end: String, description: String }],
    college: ref('College'),
    collegeRole: { type: String, enum: COLLEGE_ROLES },
    batch: Number,
    verified: { type: Boolean, default: false },
    connectionsCount: { type: Number, default: 0 },
    mentor: { enabled: { type: Boolean, default: false }, topics: [String], slots: [String], about: String },
    blocked: { type: [ref('User')], select: false },
    passwordChangedAt: Date,
    lastActiveAt: Date,
    // When the member agreed to the Terms of Use and Privacy Policy at sign-up.
    termsAcceptedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

userSchema.index({ college: 1, verified: 1, batch: -1 });
userSchema.index({ 'mentor.enabled': 1 });

userSchema.pre('validate', function setUsername() {
  if (!this.username) this.username = randomSlug(this.name);
});

// OWASP's Argon2id baseline: 19 MiB of memory, 2 passes, 1 lane (about 50 ms per hash on a small server).
const ARGON2 = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

/** Hashes new passwords with Argon2id; a changed password also signs out sessions issued before it. */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await argon2.hash(this.password, ARGON2);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

/**
 * Checks a password. Accounts from before Argon2id still have a bcrypt hash: once the right password is given it is
 * re-hashed in place (not through save(), which would sign the member out everywhere), so nobody has to reset.
 */
userSchema.methods.checkPassword = async function checkPassword(password) {
  const legacy = this.password.startsWith('$2');
  if (!(legacy ? await bcrypt.compare(password, this.password) : await argon2.verify(this.password, password))) return false;
  if (legacy || argon2.needsRehash(this.password, ARGON2)) await this.constructor.updateOne({ _id: this._id }, { password: await argon2.hash(password, ARGON2) });
  return true;
};

export default model('User', userSchema);
