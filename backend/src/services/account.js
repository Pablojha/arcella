import Answer from '../models/Answer.js';
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
  [Post, 'saves'],
  [Project, 'appreciations'],
  [Resource, 'bookmarks'],
  [Event, 'attendees'],
  [Story, 'viewers'],
  [Firm, 'team'],
  [Firm, 'followers'],
  [User, 'blocked'],
];

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
    Message.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
    Notification.deleteMany({ $or: [{ user: userId }, { actor: userId }] }),
    Session.deleteMany({ $or: [{ mentor: userId }, { mentee: userId }] }),
    Verification.deleteMany({ user: userId }),
    Report.deleteMany({ $or: [{ reporter: userId }, { type: 'user', target: userId }] }),
  ]);
  await user.deleteOne();
  await removeFiles([user.avatar, user.cover]);
}
