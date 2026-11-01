import Report from '../models/Report.js';
import { CONTENT } from '../services/content.js';
import { found } from '../utils/errors.js';

/** Files (or updates) the viewer's open report about a piece of content or a member. */
export async function create(req, res) {
  const { type, target, reason, note } = req.body;
  const [Model] = CONTENT[type];
  found(await Model.exists({ _id: target }), 'That content');
  await Report.findOneAndUpdate({ reporter: req.user._id, type, target, status: 'open' }, { reason, note }, { upsert: true });
  res.status(201).json({ ok: true });
}
