import Comment from '../models/Comment.js';
import Connection from '../models/Connection.js';
import Post from '../models/Post.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { removeContent } from '../services/content.js';
import { notify } from '../services/notify.js';
import { saveFile, saveFiles } from '../services/storage.js';
import { assertCanManage, assertMember } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate, toggle } from '../utils/query.js';
import { has, same, withCount } from '../utils/shape.js';
import { excerpt } from '../utils/text.js';

const AUTHOR = { path: 'author', select: CARD };
const WITH_ORIGINAL = [AUTHOR, { path: 'repostOf', populate: AUTHOR }];

/**
 * Posts as a viewer sees them: like counts instead of who liked, private saved/reposted flags, and a
 * repost's original shaped the same way (null once it is deleted or its author is hidden from the viewer).
 */
async function cards(viewer, posts, hidden) {
  const hiddenSet = new Set((hidden ?? (await hiddenIds(viewer))).map(String));
  const ids = posts.flatMap((post) => [post._id, post.repostOf?._id]).filter(Boolean);
  const reposted = new Set((await Post.find({ author: viewer._id, repostOf: { $in: ids }, text: null }).distinct('repostOf')).map(String));
  const card = ({ saves = [], repostOf, ...post }) => ({
    ...withCount(post, 'likes', viewer._id, 'liked'),
    saved: has(saves, viewer._id),
    reposted: reposted.has(String(post._id)),
    ...(repostOf !== undefined && { repostOf: repostOf && !hiddenSet.has(String(repostOf.author?._id)) ? card(repostOf) : null }),
  });
  return posts.map(card);
}

/** Loads a post the viewer may see: public posts, or group posts of their own college. */
async function readablePost(req) {
  const post = found(await Post.findById(req.params.id), 'Post');
  if (post.college) assertMember(req.user, post.college);
  return post;
}

export async function feed(req, res) {
  const { scope, author, college, saved } = req.query;
  if (college) assertMember(req.user, college);
  const hidden = await hiddenIds(req.user);
  const filter = { college: college ?? null, author: { $nin: hidden } };
  if (saved) {
    filter.saves = req.user._id;
    // Saved group posts stay listed only while the viewer can still read that group.
    if (req.user.isAdmin) delete filter.college;
    else filter.college = { $in: [null, req.user.verified ? req.user.college : null] };
  }
  if (author) filter.author.$eq = author;
  else if (scope === 'network') filter.author.$in = [req.user._id, ...(await Connection.idsOf(req.user._id))];
  const page = await paginate(Post.find(filter).sort({ _id: -1 }).populate(WITH_ORIGINAL), req.query);
  res.json({ ...page, items: await cards(req.user, page.items, hidden) });
}

export async function get(req, res) {
  const post = await readablePost(req);
  await post.populate(WITH_ORIGINAL);
  const [card] = await cards(req.user, [post.toObject()]);
  res.json(card);
}

export async function create(req, res) {
  const { text, college } = req.body;
  const { images = [], video: [video] = [] } = req.files ?? {};
  if (!text && !images.length && !video) throw new ApiError(400, 'Write something or add a photo or video');
  if (images.length && video) throw new ApiError(400, 'Add photos or one video, not both');
  if (college) assertMember(req.user, college);
  const post = await Post.create({ author: req.user._id, text, college, images: await saveFiles(images, 'posts'), video: video && (await saveFile(video, 'posts')) });
  await post.populate(AUTHOR);
  const [card] = await cards(req.user, [post.toObject()]);
  res.status(201).json(card);
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

export async function save(req, res) {
  await readablePost(req);
  const { active } = await toggle(Post, req.params.id, 'saves', req.user._id);
  res.json({ saved: active });
}

/** Reposts a post (the original, when handed a repost), plainly or with the reposter's words. Group posts stay in their group. */
export async function repost(req, res) {
  const post = await readablePost(req);
  const original = post.repostOf ? found(await Post.findById(post.repostOf), 'Post') : post;
  if (original.college) throw new ApiError(400, 'College group posts stay inside the group');
  const text = req.body.text || undefined;
  if (!text && (await Post.exists({ author: req.user._id, repostOf: original._id, text: null }))) throw new ApiError(409, 'You already reposted this');
  const created = await Post.create({ author: req.user._id, text, repostOf: original._id });
  const { repostsCount } = await Post.findByIdAndUpdate(original._id, { $inc: { repostsCount: 1 } }, { new: true });
  await notify({ user: original.author, actor: req.user._id, type: 'repost', text: excerpt(text || original.text), link: `/posts/${text ? created._id : original._id}` });
  res.status(201).json({ repostsCount });
}

export async function undoRepost(req, res) {
  for (const { _id } of await Post.find({ author: req.user._id, repostOf: req.params.id, text: null }).select('_id').lean()) await removeContent('post', _id);
  const { repostsCount } = found(await Post.findById(req.params.id).select('repostsCount').lean(), 'Post');
  res.json({ repostsCount });
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
