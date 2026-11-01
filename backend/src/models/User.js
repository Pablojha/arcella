import { Schema, model } from 'mongoose';
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

/** Hashes new passwords; a changed password also signs out sessions issued before it. */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.password);
};

export default model('User', userSchema);
