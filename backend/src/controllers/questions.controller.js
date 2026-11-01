import Answer from '../models/Answer.js';
import Question from '../models/Question.js';
import { CARD } from '../config/constants.js';
import { removeContent } from '../services/content.js';
import { notify } from '../services/notify.js';
import { assertCanManage } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate, toggle } from '../utils/query.js';
import { same, withCount } from '../utils/shape.js';
import { excerpt, searchRegex } from '../utils/text.js';

const AUTHOR = { path: 'author', select: CARD };
const shape = (viewerId) => (item) => withCount(item, 'upvotes', viewerId, 'upvoted');

export async function list(req, res) {
  const { q, subject, sort } = req.query;
  const filter = {};
  if (subject) filter.subject = subject;
  if (sort === 'unanswered') filter.answersCount = 0;
  if (q) filter.title = searchRegex(q);
  const order = sort === 'top' ? { votes: -1, _id: -1 } : { _id: -1 };
  res.json(await paginate(Question.find(filter).sort(order).select('-body').populate(AUTHOR), req.query, shape(req.user._id)));
}

export async function get(req, res) {
  const question = found(await Question.findById(req.params.id).populate(AUTHOR).lean(), 'Question');
  const answers = await Answer.find({ question: question._id }).sort({ votes: -1, _id: 1 }).populate(AUTHOR).lean();
  const accepted = (answer) => same(answer._id, question.accepted);
  answers.sort((a, b) => accepted(b) - accepted(a));
  res.json({ question: shape(req.user._id)(question), answers: answers.map(shape(req.user._id)) });
}

export async function create(req, res) {
  res.status(201).json(await Question.create({ ...req.body, author: req.user._id }));
}

export async function upvote(req, res) {
  const { active, count } = await toggle(Question, req.params.id, 'upvotes', req.user._id, 'votes');
  res.json({ upvoted: active, upvotesCount: count });
}

export async function remove(req, res) {
  const question = found(await Question.findById(req.params.id), 'Question');
  await assertCanManage(req.user, question.author);
  await removeContent('question', question._id);
  res.json({ ok: true });
}

export async function answer(req, res) {
  const question = found(await Question.findById(req.params.id).select('author title'), 'Question');
  const created = await Answer.create({ question: question._id, author: req.user._id, body: req.body.body });
  await Question.updateOne({ _id: question._id }, { $inc: { answersCount: 1 } });
  await notify({ user: question.author, actor: req.user._id, type: 'answer', text: excerpt(question.title), link: `/qa/${question._id}` });
  await created.populate(AUTHOR);
  res.status(201).json(shape(req.user._id)(created.toObject()));
}

export async function upvoteAnswer(req, res) {
  const { active, count } = await toggle(Answer, req.params.answerId, 'upvotes', req.user._id, 'votes');
  res.json({ upvoted: active, upvotesCount: count });
}

/** The asker marks (or unmarks) an answer as accepted. */
export async function accept(req, res) {
  const question = found(await Question.findById(req.params.id), 'Question');
  if (!same(question.author, req.user._id)) throw new ApiError(403, 'Only the person who asked can accept an answer');
  const chosen = found(await Answer.findOne({ _id: req.params.answerId, question: question._id }), 'Answer');
  question.accepted = same(question.accepted, chosen._id) ? null : chosen._id;
  await question.save();
  if (question.accepted) {
    await notify({ user: chosen.author, actor: req.user._id, type: 'accepted', text: excerpt(question.title), link: `/qa/${question._id}` });
  }
  res.json({ accepted: question.accepted });
}

export async function removeAnswer(req, res) {
  const target = found(await Answer.findOne({ _id: req.params.answerId, question: req.params.id }), 'Answer');
  await assertCanManage(req.user, target.author);
  await removeContent('answer', target._id);
  res.json({ ok: true });
}
