import Comment from '../models/Comment.js';
import Connection from '../models/Connection.js';
import Post from '../models/Post.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { removeContent } from '../services/content.js';
import { notify } from '../services/notify.js';
import { saveFiles } from '../services/storage.js';
import { assertCanManage, assertMember } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate, toggle } from '../utils/query.js';
import { same, withCount } from '../utils/shape.js';
import { excerpt } from '../utils/text.js';

const AUTHOR = { path: 'author', select: CARD };
const shape = (viewerId) => (post) => withCount(post, 'likes', viewerId, 'liked');

/** Loads a post the viewer may see: public posts, or group posts of their own college. */
async function readablePost(req) {
  const post = found(await Post.findById(req.params.id), 'Post');
  if (post.college) assertMember(req.user, post.college);
  return post;
}

export async function feed(req, res) {
  const { scope, author, college } = req.query;
  if (college) assertMember(req.user, college);
  const filter = { college: college ?? null, author: { $nin: await hiddenIds(req.user) } };
  if (author) filter.author.$eq = author;
  else if (scope === 'network') filter.author.$in = [req.user._id, ...(await Connection.idsOf(req.user._id))];
  res.json(await paginate(Post.find(filter).sort({ _id: -1 }).populate(AUTHOR), req.query, shape(req.user._id)));
}

export async function get(req, res) {
  const post = await readablePost(req);
  await post.populate(AUTHOR);
  res.json(shape(req.user._id)(post.toObject()));
}

export async function create(req, res) {
  const { text, college } = req.body;
  if (!text && !req.files?.length) throw new ApiError(400, 'Write something or add a photo');
  if (college) assertMember(req.user, college);
  const post = await Post.create({ author: req.user._id, text, college, images: await saveFiles(req.files, 'posts') });
  await post.populate(AUTHOR);
  res.status(201).json(shape(req.user._id)(post.toObject()));
}

export async function remove(req, res) {
  const post = found(await Post.findById(req.params.id), 'Post');
  await assertCanManage(req.user, post.author, post.college);
  await removeContent('post', post._id);
  res.json({ ok: true });
}

export async function like(req, res) {
  await readablePost(req);
  const { doc, active, count } = await toggle(Post, req.params.id, 'likes', req.user._id);
  if (active) await notify({ user: doc.author, actor: req.user._id, type: 'like', text: excerpt(doc.text), link: `/posts/${doc._id}` });
  res.json({ liked: active, likesCount: count });
}

export async function comments(req, res) {
  await readablePost(req);
  const items = await Comment.find({ post: req.params.id, author: { $nin: await hiddenIds(req.user) } }).sort({ _id: 1 }).populate(AUTHOR).lean();
  res.json({ items });
}

export async function addComment(req, res) {
  const post = await readablePost(req);
  const comment = await Comment.create({ post: post._id, author: req.user._id, text: req.body.text });
  await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });
  await notify({ user: post.author, actor: req.user._id, type: 'comment', text: excerpt(req.body.text), link: `/posts/${post._id}` });
  await comment.populate(AUTHOR);
  res.status(201).json(comment);
}

export async function removeComment(req, res) {
  const post = await readablePost(req);
  const comment = found(await Comment.findOne({ _id: req.params.commentId, post: post._id }), 'Comment');
  if (!same(post.author, req.user._id)) await assertCanManage(req.user, comment.author, post.college);
  await removeContent('comment', comment._id);
  res.json({ ok: true });
}
