import SupportTicket from '../models/SupportTicket.js';
import { CARD } from '../config/constants.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate } from '../utils/query.js';

const OPEN_LIMIT = 5;

/** A member writes to the team. A few open requests at a time keeps the queue honest. */
export async function create(req, res) {
  if ((await SupportTicket.countDocuments({ user: req.user._id, status: 'open' })) >= OPEN_LIMIT) {
    throw new ApiError(429, 'You have several open requests. Please wait for a reply before sending more.');
  }
  const ticket = await SupportTicket.create({ ...req.body, user: req.user._id, agent: req.get('user-agent')?.slice(0, 300) });
  res.status(201).json(ticket);
}

export async function mine(req, res) {
  res.json(await paginate(SupportTicket.find({ user: req.user._id }).sort({ updatedAt: -1 }).populate('replies.author', 'name'), req.query));
}

/** The member adds to their own request, which reopens it for the team. */
export async function followUp(req, res) {
  const ticket = found(await SupportTicket.findOne({ _id: req.params.id, user: req.user._id }), 'Request');
  ticket.replies.push({ author: req.user._id, staff: false, text: req.body.text });
  ticket.status = 'open';
  await ticket.save();
  res.json(ticket);
}

/** The staff queue: open requests first by default. */
export async function queue(req, res) {
  const filter = req.query.status ? { status: req.query.status } : { status: 'open' };
  res.json(await paginate(SupportTicket.find(filter).sort({ _id: -1 }).populate('user', `${CARD} email`).populate('replies.author', 'name'), req.query));
}

/** Staff answer (and optionally close) a request; the member is notified and the reply is in the audit log. */
export async function answer(req, res) {
  const ticket = found(await SupportTicket.findById(req.params.id), 'Request');
  const { text, close } = req.body;
  if (text) ticket.replies.push({ author: req.user._id, staff: true, text });
  ticket.status = close ? 'closed' : text ? 'answered' : ticket.status;
  await ticket.save();
  if (text) await notify({ user: ticket.user, type: 'support_reply', text: ticket.subject, link: '/help?tab=requests' });
  await audit(req, close ? 'support.close' : 'support.reply', { type: 'support', id: ticket._id }, { subject: ticket.subject });
  res.json(ticket);
}
