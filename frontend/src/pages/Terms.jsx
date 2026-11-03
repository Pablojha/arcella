import { Link } from 'react-router-dom';
import LegalPage, { ContactEmail, Missing } from '../components/legal/LegalPage';
import { SITE } from '../config/site';
import { usePageMeta } from '../hooks/usePageMeta';

const Policy = ({ to, children }) => (
  <Link to={to} className="text-brand">
    {children}
  </Link>
);

const SECTIONS = [
  {
    id: 'agreement',
    title: 'Agreeing to these terms',
    body: (
      <p>
        By creating an account or using Arcella, you agree to these terms, our <Policy to="/privacy">Privacy Policy</Policy> and our <Policy to="/guidelines">Community Guidelines</Policy>. Arcella is run by{' '}
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
    body: <p>Give honest details when you verify a college. Each college&apos;s admins and Arcella admins review requests, and verification can be removed if details turn out to be wrong.</p>,
  },
  {
    id: 'content',
    title: 'Your content',
    body: (
      <p>
        You own what you post. You give Arcella a non-exclusive, royalty-free, worldwide licence to store, show and deliver it to the people allowed to see it, only as needed to run the service. The licence ends when you
        delete the content or your account (copies in backups may remain for a short time).
      </p>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    body: (
      <ul>
        <li>Post only work you made or have the right to share, and credit other people&apos;s work. Drawings, photos and designs are protected by copyright.</li>
        <li>The Arcella name, logo, design and software belong to Arcella&apos;s operator. Don&apos;t use them in a way that suggests we endorse you, or copy the service, without written permission.</li>
        <li>
          If you believe your work is on Arcella without permission, follow our <Policy to="/copyright">Copyright Policy</Policy>. Accounts that repeatedly infringe will be closed.
        </li>
      </ul>
    ),
  },
  {
    id: 'rules',
    title: 'Rules everyone follows',
    body: (
      <p>
        Everyone follows the <Policy to="/guidelines">Community Guidelines</Policy>: no harassment, hate, threats or sexual content; nothing illegal or that sexualises minors; no spam, scams or impersonation; no sharing others&apos;
        private information; no malware, scraping or attempts to get into accounts or systems that aren&apos;t yours; and no misuse of reports or Important posts.
      </p>
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
    body: <p>We may remove content, or limit, suspend or delete accounts that break these terms or the law. College admins can remove content in their college group. Use Report on anything that breaks the rules.</p>,
  },
  {
    id: 'links',
    title: 'Other websites',
    body: <p>Arcella may link to or show content from other services. We aren&apos;t responsible for other websites or their content.</p>,
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: (
      <p>
        We work to keep Arcella running, safe and secure, but it is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. As far as the law allows, we make no promises that it will always be available, error-free, or that member
        content, listings or advice on it are accurate. Features may change and there may be interruptions.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        As far as the law allows, Arcella&apos;s operator is not liable for indirect or consequential losses (such as lost opportunities, data or profits) arising from your use of Arcella, or for what other members post or do.{' '}
        {SITE.liabilityCap ?? <Missing>any cap on liability, decided with legal advice</Missing>}. Nothing in these terms limits liability that the law doesn&apos;t allow to be limited.
      </p>
    ),
  },
  {
    id: 'indemnity',
    title: 'Responsibility for your content',
    body: <p>If someone makes a claim against Arcella&apos;s operator because of content you posted or because you broke these terms, you agree to cover the reasonable costs of that claim, as far as the law allows.</p>,
  },
  {
    id: 'grievances',
    title: 'Grievance Officer',
    body: (
      <>
        <p>
          Under India&apos;s Information Technology Act, 2000 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, complaints about content or the use of Arcella can be sent to our Grievance
          Officer, {SITE.grievanceOfficer ?? <Missing>Grievance Officer&apos;s name</Missing>}, at <ContactEmail />.
        </p>
        <p>We acknowledge complaints within 24 hours and resolve them within 15 days of receipt, as the Rules require.</p>
      </>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your use',
    body: (
      <p>
        You can delete your account at any time in <Policy to="/settings">Settings</Policy>. We may end access for serious or repeated breaches of these terms.
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
  usePageMeta({ path: '/terms', description: "The rules for using Arcella: who can join, your account, your content, intellectual property, what isn't allowed, moderation and grievances." });
  return <LegalPage title="Terms of Use" intro="These terms set out how Arcella works and what we expect from everyone who uses it." sections={SECTIONS} />;
}
