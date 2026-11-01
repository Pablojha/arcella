import Event from '../models/Event.js';
import { CARD } from '../config/constants.js';
import { removeContent } from '../services/content.js';
import { saveFile } from '../services/storage.js';
import { assertCanManage, assertMember } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate, toggle } from '../utils/query.js';
import { withCount } from '../utils/shape.js';

const TWO_HOURS = 2 * 60 * 60 * 1000;
const shape = (viewerId) => (event) => withCount(event, 'attendees', viewerId, 'going');
const visibleTo = (user) => ({ $or: [{ college: null }, ...(user.verified ? [{ college: user.college }] : [])] });

async function visibleEvent(req) {
  const event = found(await Event.findById(req.params.id), 'Event');
  if (event.college) assertMember(req.user, event.college);
  return event;
}

export async function list(req, res) {
  const { type, when, college } = req.query;
  const past = when === 'past';
  const filter = { ...visibleTo(req.user), end: past ? { $lt: new Date() } : { $gte: new Date() } };
  if (type) filter.type = type;
  if (college) {
    assertMember(req.user, college);
    filter.college = college;
  }
  const query = Event.find(filter).sort({ start: past ? -1 : 1 }).select('-description').populate('college', 'short');
  res.json(await paginate(query, req.query, shape(req.user._id)));
}

export async function get(req, res) {
  const event = await visibleEvent(req);
  await event.populate([{ path: 'host', select: CARD }, { path: 'college', select: 'name short' }]);
  res.json(shape(req.user._id)(event.toObject()));
}

export async function create(req, res) {
  const { collegeOnly, ...body } = req.body;
  if (collegeOnly && !req.user.verified) throw new ApiError(403, 'Verify your college to host college-only events');
  if (body.end && body.end <= body.start) throw new ApiError(400, 'The event must end after it starts');
  if (body.online ? !body.link : !body.venue) throw new ApiError(400, body.online ? 'Add the joining link for an online event' : 'Add a venue, or mark the event as online');
  const event = await Event.create({
    ...body,
    end: body.end ?? new Date(body.start.getTime() + TWO_HOURS),
    college: collegeOnly ? req.user.college : null,
    host: req.user._id,
    cover: req.file ? await saveFile(req.file, 'events') : undefined,
  });
  res.status(201).json(event);
}

export async function rsvp(req, res) {
  await visibleEvent(req);
  const { active, count } = await toggle(Event, req.params.id, 'attendees', req.user._id);
  res.json({ going: active, attendeesCount: count });
}

export async function remove(req, res) {
  const event = found(await Event.findById(req.params.id), 'Event');
  await assertCanManage(req.user, event.host, event.college);
  await removeContent('event', event._id);
  res.json({ ok: true });
}
