import { Schema, model } from 'mongoose';
import { EVENT_TYPES } from '../config/constants.js';
import { ref } from './types.js';

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    description: String,
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    venue: String,
    online: { type: Boolean, default: false },
    link: String,
    cover: String,
    college: ref('College', { default: null }),
    host: ref('User', { required: true }),
    attendees: [ref('User')],
  },
  { timestamps: true },
);

eventSchema.index({ college: 1, end: 1, start: 1 });

export default model('Event', eventSchema);
