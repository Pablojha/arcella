import { Schema } from 'mongoose';

export const ref = (model, options = {}) => ({ type: Schema.Types.ObjectId, ref: model, ...options });
