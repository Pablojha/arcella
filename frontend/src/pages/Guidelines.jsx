import { Link } from 'react-router-dom';
import LegalPage, { ContactEmail } from '../components/legal/LegalPage';
import { usePageMeta } from '../hooks/usePageMeta';

const SECTIONS = [
  {
    id: 'spirit',
    title: 'The spirit of Arcella',
    body: <p>Arcella is a professional space for architecture: share work, give honest and kind critique, and help each other grow. Treat others the way you would in a studio crit you respect.</p>,
  },
  {
    id: 'allowed',
    title: 'What belongs here',
    body: (
      <ul>
        <li>Your own projects, sketches, site visits, thesis work and reels, credited properly when others contributed.</li>
        <li>Questions, answers, resources, events, jobs and internships for the architecture community.</li>
        <li>Critique that is about the work, specific, and useful, even when it is tough.</li>
      </ul>
    ),
  },
  {
    id: 'not-allowed',
    title: 'What is not allowed',
    body: (
      <ul>
        <li>Harassment, bullying, threats, hate speech, or attacks on someone for who they are.</li>
        <li>Sexual content, graphic violence, or anything that sexualises minors (reported to the authorities).</li>
        <li>Illegal content, or content that encourages illegal activity or self-harm.</li>
        <li>Spam, scams, fake job offers, paid &ldquo;verification&rdquo;, and misleading links.</li>
        <li>Impersonating people, colleges or firms, or lying in college verification.</li>
        <li>Someone else&apos;s drawings, photos or designs posted as your own (see the <Link to="/copyright" className="text-brand">Copyright Policy</Link>).</li>
        <li>Sharing anyone&apos;s private information (phone numbers, addresses, documents) without permission.</li>
        <li>Malware, scraping, automated accounts, or attempts to break into accounts or systems.</li>
        <li>Misusing Important posts (for real announcements only) or reports.</li>
      </ul>
    ),
  },
  {
    id: 'groups',
    title: 'College groups',
    body: <p>College groups and their chats are for verified members of that college. Keep them on topic and respectful. Each group&apos;s admin and co-admin can remove posts and messages there.</p>,
  },
  {
    id: 'reporting',
    title: 'Reporting',
    body: (
      <p>
        Use <strong>Report</strong> on any post, comment, project, question, answer, message or profile, and choose the reason. Reports are private. Arcella admins review them (and college admins review content in their group),
        and you can block anyone at any time.
      </p>
    ),
  },
  {
    id: 'enforcement',
    title: 'What happens when rules are broken',
    body: (
      <ul>
        <li>Content that breaks these guidelines is removed.</li>
        <li>Depending on how serious it is and whether it keeps happening, we may limit, suspend or delete the account.</li>
        <li>Content we are lawfully ordered to remove is removed within the time the law sets.</li>
      </ul>
    ),
  },
  {
    id: 'appeals',
    title: 'Appeals and complaints',
    body: (
      <p>
        If you think we got a decision wrong, or want to complain about content, write to <ContactEmail /> or our Grievance Officer (see the{' '}
        <Link to="/terms#grievances" className="text-brand">
          Terms
        </Link>
        ). Tell us what was removed and why you think it should stay.
      </p>
    ),
  },
];

export default function Guidelines() {
  usePageMeta({ path: '/guidelines', description: "Arcella's Community Guidelines: what belongs on the network, what isn't allowed, how reporting and moderation work, and how to appeal." });
  return <LegalPage title="Community Guidelines" intro="How we keep Arcella a professional, safe and useful place for architecture." sections={SECTIONS} />;
}
