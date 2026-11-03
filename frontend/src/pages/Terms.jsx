import { Link } from 'react-router-dom';
import LegalPage, { ContactEmail, Missing } from '../components/legal/LegalPage';
import { SITE } from '../config/site';
import { usePageMeta } from '../hooks/usePageMeta';

const SECTIONS = [
  {
    id: 'agreement',
    title: 'Agreeing to these terms',
    body: (
      <p>
        By creating an account or using Arcella, you agree to these terms and to our <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link>. Arcella is run by{' '}
        {SITE.operator ?? <Missing>name of the person or company that runs Arcella</Missing>}.
      </p>
    ),
  },
  {
    id: 'who',
    title: 'Who can join',
    body: <p>Arcella is for architecture students, graduates, teachers, professionals and firms. You must be at least 16 to use it.</p>,
  },
  {
    id: 'account',
    title: 'Your account',
    body: (
      <ul>
        <li>Use your real name and correct details. One person, one account.</li>
        <li>Keep your password private. You are responsible for what happens on your account.</li>
        <li>
          If you think someone else has used your account, change your password in Settings and tell us at <ContactEmail />.
        </li>
      </ul>
    ),
  },
  {
    id: 'verification',
    title: 'College verification',
    body: <p>Give honest details when you verify your college. Your college&apos;s admins and Arcella admins review requests, and verification can be removed if details turn out to be wrong.</p>,
  },
  {
    id: 'content',
    title: 'Your content',
    body: (
      <p>
        You own what you post. You allow Arcella to store it, show it and deliver it to the people allowed to see it, as needed to run the service. You can delete it at any time. Post only work you have the right to share,
        and credit others&apos; work.
      </p>
    ),
  },
  {
    id: 'rules',
    title: 'Rules everyone follows',
    body: (
      <>
        <p>Don&apos;t use Arcella to:</p>
        <ul>
          <li>harass, threaten or bully anyone, or post hateful or sexual content;</li>
          <li>post anything illegal, or anything that sexualises minors;</li>
          <li>spam, scam or impersonate someone;</li>
          <li>share someone&apos;s private information without permission;</li>
          <li>post someone else&apos;s drawings, photos or designs as your own;</li>
          <li>spread malware, scrape Arcella with automated tools, or try to get into accounts or systems that aren&apos;t yours;</li>
          <li>misuse reports or Important posts (members can mark one post a day as Important, for genuinely important updates).</li>
        </ul>
      </>
    ),
  },
  {
    id: 'listings',
    title: 'Jobs, firms, events and mentoring',
    body: <p>These are posted by members. Arcella doesn&apos;t vet employers, firms or events, so check the details yourself before you share personal information, pay anything or travel.</p>,
  },
  {
    id: 'moderation',
    title: 'Moderation',
    body: <p>We may remove content, or limit, suspend or delete accounts that break these terms. College admins can remove content in their college group. Use Report on anything that breaks the rules.</p>,
  },
  {
    id: 'links',
    title: 'Other websites',
    body: <p>Arcella may link to or show content from other services. We aren&apos;t responsible for other websites.</p>,
  },
  {
    id: 'availability',
    title: 'Changes and availability',
    body: <p>We work to keep Arcella running and secure, but features may change and there may be interruptions.</p>,
  },
  {
    id: 'ending',
    title: 'Ending your use',
    body: (
      <p>
        You can delete your account at any time in <Link to="/settings" className="text-brand hover:underline">Settings</Link>. We may end access for serious or repeated breaches of these terms.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: <p>We update the date at the top of this page when these terms change. Continuing to use Arcella after a change means you accept the new terms.</p>,
  },
  {
    id: 'law',
    title: 'Governing law',
    body: <p>These terms are governed by {SITE.governingLaw ?? <Missing>governing law and courts</Missing>}.</p>,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these terms: <ContactEmail />
        {SITE.address ? `, or by post to ${SITE.address}` : ''}.
      </p>
    ),
  },
];

export default function Terms() {
  usePageMeta({ path: '/terms', description: "The rules for using Arcella: who can join, your account, your content, what isn't allowed and how moderation works." });
  return <LegalPage title="Terms of Use" intro="These terms set out how Arcella works and what we expect from everyone who uses it." sections={SECTIONS} />;
}
