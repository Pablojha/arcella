import Session from '../models/Session.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { notify } from '../services/notify.js';
import { profileOf } from '../services/profile.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate } from '../utils/query.js';
import { same } from '../utils/shape.js';
import { searchRegex } from '../utils/text.js';

/** Allowed status changes per participant and current status. */
const TRANSITIONS = {
  mentor: { pending: ['accepted', 'declined'], accepted: ['done', 'declined'] },
  mentee: { pending: ['cancelled'], accepted: ['cancelled'] },
};

export async function mentors(req, res) {
  const filter = { 'mentor.enabled': true, _id: { $nin: [req.user._id, ...(await hiddenIds(req.user))] } };
  if (req.query.q) {
    const rx = searchRegex(req.query.q);
    filter.$or = [{ name: rx }, { headline: rx }, { 'mentor.topics': rx }];
  }
  const query = User.find(filter).select(`${CARD} mentor college`).populate('college', 'short').sort({ connectionsCount: -1, _id: -1 });
  res.json(await paginate(query, req.query));
}

export async function settings(req, res) {
  if (req.user.type === 'student') throw new ApiError(403, 'Mentoring is open to alumni, faculty and professionals');
  const mentor = { ...req.user.toObject().mentor, ...req.body };
  if (mentor.enabled && (!mentor.topics?.length || !mentor.slots?.length)) throw new ApiError(400, 'Add at least one topic and one free time slot');
  req.user.mentor = mentor;
  await req.user.save();
  res.json({ user: await profileOf(req.user) });
}

export async function sessions(req, res) {
  const me = req.user._id;
  const items = await Session.find({ $or: [{ mentor: me }, { mentee: me }] }).sort({ _id: -1 }).populate('mentor mentee', CARD).lean();
  res.json({ items });
}

export async function request(req, res) {
  const { mentor: mentorId, topic, slot, note } = req.body;
  if (same(mentorId, req.user._id)) throw new ApiError(400, "You can't book a session with yourself");
  const mentor = found(await User.findOne({ _id: mentorId, 'mentor.enabled': true }).select('mentor'), 'Mentor');
  if (!mentor.mentor.slots.includes(slot)) throw new ApiError(400, "Pick one of the mentor's free slots");
  if (await Session.exists({ mentor: mentorId, mentee: req.user._id, status: 'pending' })) {
    throw new ApiError(409, 'You already have a pending request with this mentor');
  }
  const session = await Session.create({ mentor: mentorId, mentee: req.user._id, topic, slot, note });
  await notify({ user: mentorId, actor: req.user._id, type: 'mentor_request', text: topic, link: '/mentors?tab=sessions' });
  await session.populate('mentor mentee', CARD);
  res.status(201).json(session);
}

export async function update(req, res) {
  const session = found(await Session.findById(req.params.id), 'Session');
  const role = same(session.mentor, req.user._id) ? 'mentor' : same(session.mentee, req.user._id) ? 'mentee' : null;
  const { status } = req.body;
  if (!role || !TRANSITIONS[role][session.status]?.includes(status)) throw new ApiError(400, 'That change is not allowed for this session');
  session.status = status;
  await session.save();
  await notify({
    user: role === 'mentor' ? session.mentee : session.mentor,
    actor: req.user._id,
    type: 'mentor_update',
    text: `${status}: ${session.topic}`,
    link: '/mentors?tab=sessions',
  });
  await session.populate('mentor mentee', CARD);
  res.json(session);
}
