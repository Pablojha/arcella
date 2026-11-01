import { Schema, model } from 'mongoose';
import { RESOURCE_KINDS } from '../config/constants.js';
import { ref } from './types.js';

const resourceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    kind: { type: String, enum: RESOURCE_KINDS, required: true },
    semester: { type: Number, min: 1, max: 10, required: true },
    subject: String,
    file: { url: String, name: String, size: Number, ext: String },
    uploader: ref('User', { required: true }),
    bookmarks: [ref('User')],
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true },
);

resourceSchema.index({ semester: 1, kind: 1, _id: -1 });

export default model('Resource', resourceSchema);
