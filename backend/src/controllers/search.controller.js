import Connection from '../models/Connection.js';
import Firm from '../models/Firm.js';
import Job, { openRoles } from '../models/Job.js';
import Project from '../models/Project.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { withCount } from '../utils/shape.js';
import { searchRegex } from '../utils/text.js';

/** One query across people, projects, open jobs, firms and questions; the top few of each. */
export async function search(req, res) {
  const me = req.user._id;
  const rx = searchRegex(req.query.q);
  const [people, projects, jobs, firms, questions] = await Promise.all([
    User.find({ _id: { $nin: [me, ...(await hiddenIds(req.user))] }, $or: [{ name: rx }, { headline: rx }, { skills: rx }, { software: rx }] })
      .select(`${CARD} college`)
      .populate('college', 'short')
      .sort({ verified: -1, connectionsCount: -1 })
      .limit(5)
      .lean(),
    Project.find({ $or: [{ title: rx }, { tools: rx }, { site: rx }] }).select('-description').populate('owner', CARD).sort({ _id: -1 }).limit(6).lean(),
    Job.find({ ...openRoles(), $or: [{ title: rx }, { company: rx }, { skills: rx }] }).select('-description').populate('firm', 'name slug logo').sort({ _id: -1 }).limit(4).lean(),
    Firm.find({ $or: [{ name: rx }, { city: rx }] }).select('name slug logo city size followers').limit(4).lean(),
    Question.find({ title: rx }).select('-body').populate('author', CARD).sort({ votes: -1, _id: -1 }).limit(4).lean(),
  ]);
  res.json({
    people: await Connection.withStatus(me, people),
    projects: projects.map((project) => withCount(project, 'appreciations', me, 'appreciated')),
    jobs,
    firms: firms.map((firm) => withCount(firm, 'followers', me, 'following')),
    questions: questions.map((question) => withCount(question, 'upvotes', me, 'upvoted')),
  });
}
