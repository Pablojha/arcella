import { Link } from 'react-router-dom';
import LegalPage, { ContactEmail, Missing } from '../components/legal/LegalPage';
import { SITE } from '../config/site';
import { usePageMeta } from '../hooks/usePageMeta';

const SECTIONS = [
  {
    id: 'who',
    title: 'Who runs Arcella',
    body: (
      <p>
        Arcella is run by {SITE.operator ?? <Missing>name of the person or company that runs Arcella</Missing>}
        {SITE.address ? `, ${SITE.address}` : ''}. In this policy &ldquo;we&rdquo; means Arcella&apos;s operator. For anything about your data, write to <ContactEmail />.
      </p>
    ),
  },
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <ul>
        <li>Account details: your name, email address, member type, and your password, which is stored only as an Argon2id hash that can&apos;t be turned back into the password.</li>
        <li>Profile details you choose to add: photo, cover, headline, bio, location, website, software, skills, experience, education (each college with your role, degree level, degree and years) and mentoring availability.</li>
        <li>What you share: posts with photos or videos, comments and replies, likes, reactions, reposts, saves, stories, projects, critiques, questions, answers, resources, events, jobs, firm pages and reports.</li>
        <li>Messages: text, photos, videos, voice notes and GIFs, reactions, read receipts, and your chat settings (pinned and hidden chats).</li>
        <li>College verification, for each college you verify: the college, your role, degree and years, plus either your college email address (to send a code) or a document you upload.</li>
        <li>College group chats: your messages there, with their photos, videos, voice notes, GIFs and reactions.</li>
        <li>Activity the service needs: when you were last active and whether you are online (shown to people who can message you), and your notifications.</li>
        <li>Notifications on your devices: if you turn them on, your browser gives us a push address and encryption keys for that device.</li>
        <li>Technical data: your IP address and browser details reach our hosting providers with every request. We use IP addresses to limit repeated sign-in attempts. We use no analytics or advertising trackers.</li>
      </ul>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <ul>
        <li>To run Arcella: showing profiles and posts, delivering messages and notifications, and suggesting people you may know.</li>
        <li>To keep college groups private, so only verified members of a college can see its group.</li>
        <li>To keep Arcella safe: limiting repeated attempts, acting on reports and blocks, and letting admins review content and verification requests.</li>
        <li>To email you one-time codes for signing up, resetting your password and verifying a college email.</li>
        <li>We do not sell your data and we do not show ads.</li>
      </ul>
    ),
  },
  {
    id: 'visibility',
    title: 'Who can see what',
    body: (
      <ul>
        <li>Signed-in members can see your profile, public posts, projects, questions and answers. Projects also appear in the public Explore gallery.</li>
        <li>Your education is shown on your profile, with a tick on each college you verified.</li>
        <li>College group posts, group chats (with their photos, videos, voice notes and reactions) and college-only events are visible only to verified members of that college and to Arcella admins. Group posts can&apos;t be reposted.</li>
        <li>Messages, including their photos, videos, voice notes and reactions, are visible only to you and the person you are talking to.</li>
        <li>Posts you save and chats you pin or hide are visible only to you.</li>
        <li>Stories are visible to your connections and to verified members of your colleges for 24 hours.</li>
        <li>Your email address is never shown to other members.</li>
        <li>Verification documents can be seen only by Arcella admins and your college&apos;s admin and co-admin.</li>
      </ul>
    ),
  },
  {
    id: 'services',
    title: 'Services that handle data for us',
    body: (
      <>
        <p>We use these providers only to run Arcella:</p>
        <ul>
          <li>MongoDB Atlas stores the database (on Amazon Web Services in Singapore).</li>
          <li>Render runs our server (in Singapore), and Vercel hosts and delivers the website.</li>
          <li>Cloudinary stores and delivers the photos, videos, voice notes and documents you upload.</li>
          <li>An email service sends one-time codes.</li>
          <li>Your browser&apos;s push service (from Google, Mozilla, Apple or Microsoft) delivers notifications. Their contents are encrypted so the push service can&apos;t read them.</li>
          <li>When GIF search is available, your search words go to GIPHY through our server, and GIFs load from GIPHY&apos;s servers, which see your IP address.</li>
        </ul>
        <p>We may also share information when the law requires it.</p>
      </>
    ),
  },
  {
    id: 'location',
    title: 'Where your data is stored',
    body: <p>Our database and server are in Singapore, and files are delivered through worldwide networks, so your data is processed outside India.</p>,
  },
  {
    id: 'retention',
    title: 'How long we keep data',
    body: (
      <ul>
        <li>Stories disappear after 24 hours, notifications after 60 days and one-time codes after 10 minutes.</li>
        <li>Verification documents are deleted as soon as the request is approved or rejected.</li>
        <li>A device&apos;s push address is deleted when you turn notifications off, log out or change your password, or when the push service stops accepting it.</li>
        <li>Everything else stays until you delete it or your account. Deleting your account removes your profile, everything you created and the messages you sent or received.</li>
      </ul>
    ),
  },
  {
    id: 'security',
    title: 'How we protect it',
    body: (
      <p>
        Arcella uses HTTPS everywhere, hashes passwords with Argon2id, checks on the server who may see or change each thing, encrypts notifications end to end, and sends strict browser security headers. No system is perfectly secure, so please use a password you don&apos;t use elsewhere.
      </p>
    ),
  },
  {
    id: 'breaches',
    title: 'If something goes wrong',
    body: <p>If a personal data breach affects you, we will tell you and the authorities the law requires us to tell, with what happened and what you can do.</p>,
  },
  {
    id: 'choices',
    title: 'Your choices and rights',
    body: (
      <>
        <p>Anyone can, at any time:</p>
        <ul>
          <li>edit your profile, or delete anything you have shared;</li>
          <li>
            download a copy of your data in <Link to="/settings" className="text-brand">Settings</Link> → Your data;
          </li>
          <li>delete your account in Settings → Delete account, which permanently removes your profile and everything you created;</li>
          <li>turn notifications off for a device in Settings → Notifications;</li>
          <li>block members, hide chats, and report content that breaks the rules;</li>
          <li>
            choose what your browser remembers in <Link to="/cookies" className="text-brand">cookie settings</Link>.
          </li>
        </ul>
        <p>Depending on where you live, the law gives you further rights:</p>
        <ul>
          <li>
            <strong>India</strong> (Digital Personal Data Protection Act, 2023): to get a summary of your data and how it is used, to have it corrected, completed, updated or erased, to have your grievances addressed, and to
            nominate someone to exercise these rights if you die or can&apos;t.
          </li>
          <li>
            <strong>EU and UK</strong> (GDPR): to access, correct and erase your data, to restrict or object to its use, to take it with you, to withdraw consent, and to complain to your data protection authority.
          </li>
          <li>
            <strong>California</strong> (CCPA/CPRA): to know what we collect, and to delete or correct it. Arcella doesn&apos;t sell or share personal information and doesn&apos;t use it for targeted advertising, and you won&apos;t be
            treated differently for using your rights.
          </li>
        </ul>
        <p>
          For anything you can&apos;t do in Settings, write to <ContactEmail />. We may ask you to confirm it&apos;s you, and we reply within the time the law requires. Complaints can also go to our Grievance Officer (see the{' '}
          <Link to="/terms#grievances" className="text-brand">
            Terms
          </Link>
          ).
        </p>
      </>
    ),
  },
  {
    id: 'legal-bases',
    title: 'Why we may use your data (EU and UK)',
    body: (
      <ul>
        <li>To provide Arcella to you (our contract): your account, profile, posts, messages and college groups.</li>
        <li>With your consent: notifications on your devices, and remembering preferences in your browser. You can withdraw consent at any time.</li>
        <li>For legitimate interests: keeping Arcella secure and free of abuse, for example rate limits, reports and moderation.</li>
        <li>To meet legal obligations, such as answering lawful requests.</li>
      </ul>
    ),
  },
  {
    id: 'age',
    title: 'Who Arcella is for',
    body: <p>Arcella is for architecture students, graduates, teachers, professionals and firms. It is not meant for children under 16.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>We update the date at the top of this page whenever this policy changes.</p>,
  },
];

export default function Privacy() {
  usePageMeta({ path: '/privacy', description: 'What Arcella collects, who can see it, where it is stored, how long it is kept and how to delete it.' });
  return <LegalPage title="Privacy Policy" intro="This page explains, in plain words, what Arcella stores about you, who can see it and the choices you have." sections={SECTIONS} />;
}
