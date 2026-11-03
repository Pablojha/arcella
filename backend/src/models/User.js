import { Schema, model } from 'mongoose';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import { COLLEGE_ROLES, DEGREE_LEVELS, USER_TYPES } from '../config/constants.js';
import { ROLES, isAdminRole } from '../config/permissions.js';
import { randomSlug } from '../utils/text.js';
import { ref } from './types.js';

/**
 * A college the member studied or teaches at. A verified membership opens that college's private group; faculty have
 * no degree level or years. The `primary` one is mirrored in the user's college fields.
 */
const membershipSchema = new Schema({
  college: ref('College', { required: true }),
  role: { type: String, enum: COLLEGE_ROLES, required: true },
  level: { type: String, enum: DEGREE_LEVELS },
  degree: { type: String, trim: true },
  batch: Number,
  graduation: Number,
  verified: { type: Boolean, default: false },
  primary: { type: Boolean, default: false },
});

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    password: { type: String, required: true, select: false },
    type: { type: String, enum: USER_TYPES, default: 'student' },
    // Kept in step with `role` (admins and super admins), for the many ownership checks that use it.
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ROLES, default: 'user' },
    // Suspended accounts can't sign in until `suspendedUntil`; banned ones can't at all. The reason is shown to them.
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    suspendedUntil: Date,
    statusReason: String,
    avatar: String,
    cover: String,
    headline: String,
    bio: String,
    location: String,
    website: String,
    software: [String],
    skills: [String],
    experience: [{ title: String, org: String, start: String, end: String, description: String }],
    memberships: [membershipSchema],
    // The primary membership (the first verified one, or the one the member picks), shown on cards and profiles.
    college: ref('College'),
    collegeRole: { type: String, enum: COLLEGE_ROLES },
    batch: Number,
    verified: { type: Boolean, default: false },
    connectionsCount: { type: Number, default: 0 },
    mentor: { enabled: { type: Boolean, default: false }, topics: [String], slots: [String], about: String },
    blocked: { type: [ref('User')], select: false },
    passwordChangedAt: Date,
    // "Sign out other devices" ends tokens issued before this that have no device (those from before devices existed).
    signedOutAt: Date,
    // Two-factor sign-in with an authenticator app. Recovery codes are kept as SHA-256 hashes.
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
      pending: { type: String, select: false },
      lastStep: { type: Number, select: false },
      recovery: { type: [String], select: false, default: undefined },
    },
    lastActiveAt: Date,
    // When the member agreed to the Terms of Use and Privacy Policy at sign-up.
    termsAcceptedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        if (ret.twoFactor) ret.twoFactor = { enabled: Boolean(ret.twoFactor.enabled) };
        return ret;
      },
    },
  },
);

userSchema.index({ 'memberships.college': 1, 'memberships.verified': 1 });
userSchema.index({ 'mentor.enabled': 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

userSchema.pre('save', function syncAdmin() {
  if (this.isModified('role')) this.isAdmin = isAdminRole(this.role);
});

/** Why the account can't be used right now (suspended or banned), or null. */
userSchema.methods.blockedReason = function blockedReason() {
  const why = this.statusReason ? ` Reason: ${this.statusReason}` : '';
  if (this.status === 'banned') return `This account has been banned.${why}`;
  if (this.status === 'suspended' && this.suspendedUntil > new Date()) return `This account is suspended until ${this.suspendedUntil.toDateString()}.${why}`;
  return null;
};

/** Gives site admins from before roles existed a role: super admin for ADMIN_EMAIL addresses, admin otherwise. */
export async function migrateRoles(adminEmails) {
  const supers = await model('User').updateMany({ email: { $in: adminEmails }, emailVerified: true, role: { $ne: 'super_admin' } }, { role: 'super_admin', isAdmin: true });
  const admins = await model('User').updateMany({ isAdmin: true, role: { $in: ['user', null] } }, { role: 'admin' });
  return supers.modifiedCount + admins.modifiedCount;
}

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
