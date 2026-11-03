import Comment from '../models/Comment.js';
import Connection from '../models/Connection.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { removeContent } from '../services/content.js';
import { notify, notifyMany } from '../services/notify.js';
import { saveFile, saveFiles } from '../services/storage.js';
import { assertCanManage, assertMember, isModerator, memberCollegeIds, membersOf } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate, toggle } from '../utils/query.js';
import { has, same, withCount } from '../utils/shape.js';
import { excerpt } from '../utils/text.js';

const AUTHOR = { path: 'author', select: CARD };
const REPLY_TO = { path: 'replyTo', select: 'name username' };
const WITH_ORIGINAL = [AUTHOR, { path: 'repostOf', populate: AUTHOR }];
const DAY_MS = 24 * 60 * 60 * 1000;
// Feed photos range from portrait 4:5 to landscape 1.91:1, like Instagram; anything beyond is cropped to fit.
const MIN_ASPECT = 4 / 5;
const MAX_ASPECT = 1.91;

/**
 * Posts as a viewer sees them: like counts instead of who liked (plus one liker to name, a connection when possible),
 * private saved/reposted flags, and a repost's original shaped the same way (null once it is deleted or its author is
 * hidden from the viewer).
 */
async function cards(viewer, posts, hidden) {
  const hiddenSet = new Set((hidden ?? (await hiddenIds(viewer))).map(String));
  const all = posts.flatMap((post) => [post, post.repostOf]).filter(Boolean);
  const [repostedIds, connections] = await Promise.all([
    Post.find({ author: viewer._id, repostOf: { $in: all.map((post) => post._id) }, text: null }).distinct('repostOf'),
    Connection.idsOf(viewer._id),
  ]);
  const reposted = new Set(repostedIds.map(String));
  const friends = new Set(connections.map(String));
  const pickLiker = (likes = []) => {
    const others = likes.map(String).filter((id) => id !== String(viewer._id) && !hiddenSet.has(id));
    return others.findLast((id) => friends.has(id)) ?? others.at(-1);
  };
  const likerOf = new Map(all.map((post) => [String(post._id), pickLiker(post.likes)]));
  const likers = new Map((await User.find({ _id: { $in: [...likerOf.values()].filter(Boolean) } }).select('name username').lean()).map((user) => [String(user._id), user]));
  const card = ({ saves = [], repostOf, ...post }) => ({
    ...withCount(post, 'likes', viewer._id, 'liked'),
    likedBy: likers.get(likerOf.get(String(post._id))) ?? null,
    saved: has(saves, viewer._id),
    reposted: reposted.has(String(post._id)),
    ...(repostOf !== undefined && { repostOf: repostOf && !hiddenSet.has(String(repostOf.author?._id)) ? card(repostOf) : null }),
  });
  return posts.map(card);
}

/** Members may mark one post a day as Important; site admins, and college admins in their own group, have no limit. */
async function assertCanFlag(user, college) {
  if (await isModerator(user, college)) return;
  if (await Post.exists({ author: user._id, important: true, createdAt: { $gt: new Date(Date.now() - DAY_MS) } })) {
    throw new ApiError(429, 'You can mark one post a day as Important. Try again tomorrow.');
  }
}

/** Notifies the audience of an Important post: the whole group, everyone (site admins), or the author's connections. */
async function announce(user, post) {
  const audience = post.college ? User.find(membersOf(post.college)).distinct('_id') : user.isAdmin ? User.find().distinct('_id') : Connection.idsOf(user._id);
  const hidden = new Set((await hiddenIds(user)).map(String));
  const users = (await audience).filter((id) => !hidden.has(String(id)));
  await notifyMany({ users, actor: user._id, type: 'important', text: excerpt(post.text), link: `/posts/${post._id}` });
}

/** Loads a post the viewer may see: public posts, or group posts of their own college. */
async function readablePost(req) {
  const post = found(await Post.findById(req.params.id), 'Post');
  if (post.college) assertMember(req.user, post.college);
  return post;
}

export async function feed(req, res) {
  const { scope, author, college, saved, video } = req.query;
  if (college) assertMember(req.user, college);
  const hidden = await hiddenIds(req.user);
  const filter = { college: college ?? null, author: { $nin: hidden } };
  if (video) filter.video = { $type: 'string' };
  if (saved) {
    filter.saves = req.user._id;
    // Saved group posts stay listed only while the viewer can still read that group.
    if (req.user.isAdmin) delete filter.college;
    else filter.college = { $in: [null, ...memberCollegeIds(req.user)] };
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
  const { text, college, important, aspect } = req.body;
  const { images = [], video: [video] = [] } = req.files ?? {};
  if (!text && !images.length && !video) throw new ApiError(400, 'Write something or add a photo or video');
  if (images.length && video) throw new ApiError(400, 'Add photos or one video, not both');
  if (college) assertMember(req.user, college);
  if (important) await assertCanFlag(req.user, college);
  const post = await Post.create({
    author: req.user._id,
    text,
    college,
    important,
    images: await saveFiles(images, 'posts'),
    aspect: images.length && aspect ? Math.min(Math.max(aspect, MIN_ASPECT), MAX_ASPECT) : undefined,
    video: video && (await saveFile(video, 'posts')),
  });
  if (important) await announce(req.user, post);
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

/** A comment as a viewer sees it: a like count and whether they liked it, not who did. */
const commentCard = (viewer, comment) => withCount(comment, 'likes', viewer._id, 'liked');

/** Every comment and reply on a post, oldest first. Hidden people's comments go, with the replies under them. */
export async function comments(req, res) {
  await readablePost(req);
  const items = await Comment.find({ post: req.params.id, author: { $nin: await hiddenIds(req.user) } }).sort({ _id: 1 }).populate([AUTHOR, REPLY_TO]).lean();
  const threads = new Set(items.filter((comment) => !comment.parent).map((comment) => String(comment._id)));
  res.json({ items: items.filter((comment) => !comment.parent || threads.has(String(comment.parent))).map((comment) => commentCard(req.user, comment)) });
}

/**
 * Comments on a post, or replies with `parent`. A reply to a reply joins the same thread and answers its author.
 * The post's author hears about every comment; whoever was replied to hears about the reply.
 */
export async function addComment(req, res) {
  const post = await readablePost(req);
  const { text, parent: parentId } = req.body;
  const target = parentId && found(await Comment.findOne({ _id: parentId, post: post._id }).select('author parent').lean(), 'Comment');
  const comment = await Comment.create({ post: post._id, author: req.user._id, text, parent: target ? (target.parent ?? target._id) : null, replyTo: target?.author });
  await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });
  const note = { actor: req.user._id, text: excerpt(text), link: `/posts/${post._id}` };
  if (target) await notify({ ...note, user: target.author, type: 'reply' });
  if (!target || !same(target.author, post.author)) await notify({ ...note, user: post.author, type: 'comment' });
  await comment.populate([AUTHOR, REPLY_TO]);
  res.status(201).json(commentCard(req.user, comment.toObject()));
}

export async function likeComment(req, res) {
  const post = await readablePost(req);
  found(await Comment.exists({ _id: req.params.commentId, post: post._id }), 'Comment');
  const { doc, active, count } = await toggle(Comment, req.params.commentId, 'likes', req.user._id);
  if (active) await notify({ user: doc.author, actor: req.user._id, type: 'comment_like', text: excerpt(doc.text), link: `/posts/${post._id}` });
  res.json({ liked: active, likesCount: count });
}

/** Deletes a comment and the replies under it; `removed` says how many went, for the post's comment count. */
export async function removeComment(req, res) {
  const post = await readablePost(req);
  const comment = found(await Comment.findOne({ _id: req.params.commentId, post: post._id }), 'Comment');
  if (!same(post.author, req.user._id)) await assertCanManage(req.user, comment.author, post.college);
  const removed = 1 + (await Comment.countDocuments({ parent: comment._id }));
  await removeContent('comment', comment._id);
  res.json({ removed });
}
