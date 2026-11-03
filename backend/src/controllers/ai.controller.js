import { z } from 'zod';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import { aiEnabled, analyse, write } from '../services/ai.js';
import { ApiError, found } from '../utils/errors.js';

export const status = (req, res) => res.json({ enabled: aiEnabled });

const WRITING = {
  post: 'You help members of Arcella, a professional network for architecture students, alumni, faculty and firms in India, write posts. Rewrite the draft so it reads clearly and naturally in the member\'s own voice: keep every fact, name, #hashtag and @mention, keep it about the same length, and add nothing they did not say.',
  headline: 'You write one-line professional headlines for Arcella profiles (architecture students, alumni, faculty and firms in India), e.g. "B.Arch, 4th year at CEPT · interested in housing". Use only the facts given, under 120 characters, no quotation marks.',
  about: "You write the About section of an Arcella profile (architecture students, alumni, faculty and firms in India) in the first person: warm, specific and under 120 words, using only the facts given. Don't invent experience, awards or skills.",
};

/** Facts about the member that the writing and matching features may use. */
const profileFacts = (user) =>
  JSON.stringify({
    name: user.name,
    type: user.type,
    headline: user.headline,
    about: user.bio,
    location: user.location,
    skills: user.skills,
    software: user.software,
    languages: user.languages,
    experience: (user.experience ?? []).map(({ title, org, start, end }) => ({ title, org, start, end })),
    education: (user.memberships ?? []).map(({ role, degree, level, batch, graduation }) => ({ role, degree, level, batch, graduation })),
    certifications: (user.certifications ?? []).map(({ name, issuer, year }) => ({ name, issuer, year })),
  });

/** Writing help: rewrites a post draft, or drafts a headline or About from the member's profile. Returns only text. */
export async function improve(req, res) {
  const { kind, draft } = req.body;
  if (kind === 'post' && !draft) throw new ApiError(400, 'Write a draft first');
  const content = kind === 'post' ? `Draft post:\n${draft}` : `Profile facts (JSON):\n${profileFacts(req.user)}${draft ? `\n\nTheir current ${kind}:\n${draft}` : ''}\n\nWrite the ${kind}. Reply with the text only.`;
  res.json({ text: await write(WRITING[kind], content) });
}

const ResumeFeedback = z.object({
  summary: z.string().describe('Two sentences on how the resume reads to an architecture recruiter'),
  strengths: z.array(z.string()).describe('Up to 4 specific strengths'),
  improvements: z.array(z.string()).describe('Up to 5 specific, actionable improvements, most important first'),
});

/** Feedback on the member's saved PDF resume, for architecture roles. */
export async function resumeFeedback(req, res) {
  const resume = await Resume.findOne({ user: req.user._id }).select('+data').lean();
  if (!resume) throw new ApiError(400, 'Save your resume on your profile first');
  if (resume.mime !== 'application/pdf') throw new ApiError(400, 'AI feedback reads PDF resumes. Save your resume as a PDF and try again.');
  const feedback = await analyse(
    'You review resumes of architecture students and young architects in India for internships and jobs. Be specific and kind; refer to what is actually in the resume. Never invent content.',
    [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(resume.data.buffer ?? resume.data).toString('base64') } },
      { type: 'text', text: 'Review this resume.' },
    ],
    ResumeFeedback,
  );
  res.json(feedback);
}

const JobMatch = z.object({
  fit: z.number().int().min(0).max(100).describe('How well the profile fits the role, 0-100'),
  matched: z.array(z.string()).describe('Requirements the member already meets'),
  missing: z.array(z.string()).describe('Skills or experience the role asks for that the profile does not show'),
  advice: z.string().describe('Two or three sentences on how to present themselves for this role'),
});

/** How the member's profile fits a role, and what to work on. */
export async function jobMatch(req, res) {
  const job = found(await Job.findById(req.params.jobId).select('title company type workplace experience location description skills').lean(), 'Job');
  const role = JSON.stringify({ title: job.title, company: job.company, type: job.type, workplace: job.workplace, experience: job.experience, location: job.location, skills: job.skills, description: job.description });
  const match = await analyse(
    'You help architecture students and young architects in India judge how well they fit a role. Compare only what the profile and role actually say; be honest and encouraging.',
    `Role (JSON):\n${role}\n\nMember profile (JSON):\n${profileFacts(req.user)}`,
    JobMatch,
  );
  res.json(match);
}
