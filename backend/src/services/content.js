import Answer from '../models/Answer.js';
import Comment from '../models/Comment.js';
import Critique from '../models/Critique.js';
import Event from '../models/Event.js';
import Firm from '../models/Firm.js';
import GroupMessage from '../models/GroupMessage.js';
import Job from '../models/Job.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import Project from '../models/Project.js';
import Question from '../models/Question.js';
import Resource from '../models/Resource.js';
import Story from '../models/Story.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { emitToGroup } from './realtime.js';
import { removeFiles } from './storage.js';

/** Reportable things: [model, fields shown to admins, path of the author]. */
export const CONTENT = {
  post: [Post, 'text images video author', 'author'],
  comment: [Comment, 'text post author', 'author'],
  project: [Project, 'title images owner', 'owner'],
  story: [Story, 'image caption author', 'author'],
  question: [Question, 'title author', 'author'],
  answer: [Answer, 'body question author', 'author'],
  resource: [Resource, 'title file uploader', 'uploader'],
  job: [Job, 'title company postedBy', 'postedBy'],
  event: [Event, 'title host', 'host'],
  firm: [Firm, 'name slug logo owner', 'owner'],
  message: [Message, 'text media gif voice from to', 'from'],
  chat: [GroupMessage, 'text media gif voice college author', 'author'],
  user: [User, CARD, null],
};

const REMOVE = {
  async post(id) {
    const post = await Post.findByIdAndDelete(id);
    if (!post) return;
    await Comment.deleteMany({ post: id });
    if (post.repostOf) await Post.updateOne({ _id: post.repostOf }, { $inc: { repostsCount: -1 } });
    // Plain reposts only point at this post, so they go with it; reposts with the reposter's own words stay.
    for (const repost of await Post.find({ repostOf: id, text: null }).select('_id').lean()) await REMOVE.post(repost._id);
    await removeFiles([...post.images, post.video]);
  },
  async comment(id) {
    const comment = await Comment.findByIdAndDelete(id);
    if (!comment) return;
    // Replies go with the comment they answer.
    const { deletedCount } = await Comment.deleteMany({ parent: id });
    await Post.updateOne({ _id: comment.post }, { $inc: { commentsCount: -(1 + deletedCount) } });
  },
  async project(id) {
    const project = await Project.findByIdAndDelete(id);
    if (!project) return;
    await Critique.deleteMany({ project: id });
    await removeFiles(project.images);
  },
  async story(id) {
    const story = await Story.findByIdAndDelete(id);
    if (story) await removeFiles([story.image]);
  },
  async question(id) {
    if (await Question.findByIdAndDelete(id)) await Answer.deleteMany({ question: id });
  },
  async answer(id) {
    const answer = await Answer.findByIdAndDelete(id);
    if (!answer) return;
    await Question.updateOne({ _id: answer.question }, { $inc: { answersCount: -1 } });
    await Question.updateOne({ _id: answer.question, accepted: answer._id }, { accepted: null });
  },
  async resource(id) {
    const resource = await Resource.findByIdAndDelete(id);
    if (resource) await removeFiles([resource.file?.url]);
  },
  async job(id) {
    await Job.findByIdAndDelete(id);
  },
  async event(id) {
    const event = await Event.findByIdAndDelete(id);
    if (event) await removeFiles([event.cover]);
  },
  async firm(id) {
    const firm = await Firm.findByIdAndDelete(id);
    if (!firm) return;
    await Job.deleteMany({ firm: id });
    await removeFiles([firm.logo, firm.cover, ...firm.gallery]);
  },
  async message(id) {
    const message = await Message.findByIdAndDelete(id);
    if (message) await removeFiles([message.media?.url, message.voice?.url]);
  },
  async chat(id) {
    const message = await GroupMessage.findByIdAndDelete(id);
    if (!message) return;
    emitToGroup(message.college, 'group:remove', { _id: message._id });
    await removeFiles([message.media?.url, message.voice?.url]);
  },
};

/** Deletes one piece of content with everything hanging off it: comments, critiques, files and counters. */
export const removeContent = (type, id) => REMOVE[type](id);

/** A short preview of reported content for admins (null when it is already gone). */
export function previewContent(type, id) {
  const [Model, fields, author] = CONTENT[type];
  const query = Model.findById(id).select(fields);
  return (author ? query.populate(author, 'name username') : query).lean();
}
