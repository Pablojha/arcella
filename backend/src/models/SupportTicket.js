import { Schema, model } from 'mongoose';
import { SUPPORT_TOPICS } from '../config/constants.js';
import { ref } from './types.js';

/** A member's question or problem report to the Arcella team, with the team's replies. */
const supportTicketSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    topic: { type: String, enum: SUPPORT_TOPICS, required: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    // For problem reports: the page the member was on and their browser.
    page: String,
    agent: String,
    status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open' },
    replies: [{ _id: false, author: ref('User'), staff: Boolean, text: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true },
);

supportTicketSchema.index({ status: 1, _id: -1 });

export default model('SupportTicket', supportTicketSchema);
