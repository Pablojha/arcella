import Answer from '../models/Answer.js';
import ChatState from '../models/ChatState.js';
import Comment from '../models/Comment.js';
import Connection from '../models/Connection.js';
import Critique from '../models/Critique.js';
import Event from '../models/Event.js';
import Firm from '../models/Firm.js';
import GroupMessage from '../models/GroupMessage.js';
import Job from '../models/Job.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import Project from '../models/Project.js';
import PushSubscription from '../models/PushSubscription.js';
import Question from '../models/Question.js';
import Report from '../models/Report.js';
import Resource from '../models/Resource.js';
import Session from '../models/Session.js';
import Story from '../models/Story.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { removeContent } from './content.js';
import { dropCollegeRoles } from './membership.js';
import { removeFiles } from './storage.js';

/** Content a member created: [content type, model, author field]. */
const OWNED = [
  ['post', Post, 'author'],
  ['comment', Comment, 'author'],
  ['project', Project, 'owner'],
  ['story', Story, 'author'],
  ['question', Question, 'author'],
  ['answer', Answer, 'author'],
  ['resource', Resource, 'uploader'],
  ['event', Event, 'host'],
  ['job', Job, 'postedBy'],
  ['firm', Firm, 'owner'],
];

/** Arrays of user ids the member may appear in on other people's documents. */
const MENTIONS = [
  [Post, 'likes'],
  [Comment, 'likes'],
  [Post, 'saves'],
  [Project, 'appreciations'],
  [Resource, 'bookmarks'],
  [Event, 'attendees'],
  [Story, 'viewers'],
  [Firm, 'team'],
  [Firm, 'followers'],
  [User, 'blocked'],
];

/** Deletes every message to or from the user, with the photos, videos and voice notes in them. */
async function removeMessages(userId) {
  const filter = { $or: [{ from: userId }, { to: userId }] };
  const files = (await Message.find(filter).select('media.url voice.url').lean()).flatMap((message) => [message.media?.url, message.voice?.url]);
  await Message.deleteMany(filter);
  await removeFiles(files);
}

/** Lists of other members' ids (likes, followers, viewers…) become counts, so an export holds only the member's own data. */
function countIds(Model, doc) {
  const lists = Object.keys(Model.schema.paths).filter((path) => Model.schema.path(path).$embeddedSchemaType?.instance === 'ObjectId' && Array.isArray(doc[path]));
  return { ...doc, ...Object.fromEntries(lists.map((path) => [path, doc[path].length])) };
}

const PERSON = 'name username';

/**
 * Everything Arcella stores about a member, for "Download your data": their account, what they created, their
 * conversations and settings. Passwords, push keys and verification document files are never included.
 */
export async function exportAccount(userId) {
  const [account, created, messages, groupMessages, connections, notifications, chatSettings, savedPosts, verifications, reports, devices] = await Promise.all([
    User.findById(userId).select('+blocked').populate('blocked', PERSON).lean(),
    Promise.all(OWNED.map(async ([type, Model, field]) => [`${type}s`, (await Model.find({ [field]: userId }).sort({ _id: 1 }).lean()).map((doc) => countIds(Model, doc))])),
    Message.find({ $or: [{ from: userId }, { to: userId }] }).sort({ _id: 1 }).populate('from to', PERSON).lean(),
    GroupMessage.find({ author: userId }).sort({ _id: 1 }).populate('college', 'name').lean(),
    Connection.find({ $or: [{ from: userId }, { to: userId }] }).populate('from to', PERSON).lean(),
    Notification.find({ user: userId }).sort({ _id: 1 }).populate('actor', PERSON).lean(),
    ChatState.find({ user: userId }).populate('other', PERSON).lean(),
    Post.find({ saves: userId }).select('author text createdAt').populate('author', PERSON).lean(),
    Verification.find({ user: userId }).populate('college', 'name').lean(),
    Report.find({ reporter: userId }).lean(),
    PushSubscription.find({ user: userId }).select('endpoint createdAt').lean(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account,
    ...Object.fromEntries(created),
    messages,
    groupMessages,
    connections,
    notifications,
    chatSettings,
    savedPosts,
    verifications,
    reports,
    notificationDevices: devices.map(({ endpoint, createdAt }) => ({ pushService: new URL(endpoint).host, addedAt: createdAt })),
  };
}

/** Permanently removes a member and everything they created, keeping other members' counters right. */
export async function deleteAccount(userId) {
  const user = await User.findById(userId).select('avatar cover');
  if (!user) return;
  for (const [type, Model, field] of OWNED) {
    for (const { _id } of await Model.find({ [field]: userId }).select('_id').lean()) await removeContent(type, _id);
  }
  const contacts = await Connection.idsOf(userId);
  await Promise.all([
    ...MENTIONS.map(([Model, field]) => Model.updateMany({ [field]: userId }, { $pull: { [field]: userId } })),
    ...[Question, Answer].map((Model) => Model.updateMany({ upvotes: userId }, { $pull: { upvotes: userId }, $inc: { votes: -1 } })),
    User.updateMany({ _id: { $in: contacts } }, { $inc: { connectionsCount: -1 } }),
    dropCollegeRoles(userId),
    GroupMessage.deleteMany({ author: userId }),
    Critique.deleteMany({ author: userId }),
    Connection.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
    removeMessages(userId),
    ChatState.deleteMany({ $or: [{ user: userId }, { other: userId }] }),
    PushSubscription.deleteMany({ user: userId }),
    Notification.deleteMany({ $or: [{ user: userId }, { actor: userId }] }),
    Session.deleteMany({ $or: [{ mentor: userId }, { mentee: userId }] }),
    Verification.deleteMany({ user: userId }),
    Report.deleteMany({ $or: [{ reporter: userId }, { type: 'user', target: userId }] }),
  ]);
  await user.deleteOne();
  await removeFiles([user.avatar, user.cover]);
}
