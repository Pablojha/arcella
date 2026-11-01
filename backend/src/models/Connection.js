import { Schema, model } from 'mongoose';
import { same } from '../utils/shape.js';
import { ref } from './types.js';

const connectionSchema = new Schema(
  {
    from: ref('User', { required: true }),
    to: ref('User', { required: true }),
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: true },
);

connectionSchema.index({ from: 1, to: 1 }, { unique: true });
connectionSchema.index({ to: 1, status: 1 });

const pair = (a, b) => ({ $or: [{ from: a, to: b }, { from: b, to: a }] });
const statusFor = (row, userId) => (row.status === 'accepted' ? 'connected' : same(row.from, userId) ? 'outgoing' : 'incoming');

connectionSchema.statics.between = function between(a, b) {
  return this.findOne(pair(a, b));
};

/** Ids of everyone `userId` is connected with. */
connectionSchema.statics.idsOf = async function idsOf(userId) {
  const rows = await this.find({ status: 'accepted', $or: [{ from: userId }, { to: userId }] }).select('from to').lean();
  return rows.map((row) => (same(row.from, userId) ? row.to : row.from));
};

/** Map of other user id -> 'connected' | 'outgoing' | 'incoming' for a list of users. */
connectionSchema.statics.statusMap = async function statusMap(userId, ids) {
  const rows = await this.find({ $or: [{ from: userId, to: { $in: ids } }, { to: userId, from: { $in: ids } }] }).lean();
  return new Map(rows.map((row) => [String(same(row.from, userId) ? row.to : row.from), statusFor(row, userId)]));
};

connectionSchema.statics.statusOf = async function statusOf(userId, otherId) {
  if (same(userId, otherId)) return 'self';
  const row = await this.findOne(pair(userId, otherId)).lean();
  return row ? statusFor(row, userId) : 'none';
};

/** Adds the viewer's connection status to each user card. */
connectionSchema.statics.withStatus = async function withStatus(userId, users) {
  const statuses = await this.statusMap(userId, users.map((user) => user._id));
  return users.map((user) => ({ ...user, status: statuses.get(String(user._id)) ?? 'none' }));
};

/** Removes any request or connection between two members, keeping connection counts right. */
connectionSchema.statics.sever = async function sever(a, b) {
  const row = await this.findOneAndDelete(pair(a, b));
  if (row?.status === 'accepted') await model('User').updateMany({ _id: { $in: [row.from, row.to] } }, { $inc: { connectionsCount: -1 } });
};

export default model('Connection', connectionSchema);
