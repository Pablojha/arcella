import PageHeader from '../components/ui/PageHeader';

const CONTACT = import.meta.env.VITE_CONTACT_EMAIL;

const SECTIONS = [
  ['What we collect', [
    'Account details: your name, email address and a securely hashed password.',
    'Profile details you choose to add: photo, cover, headline, bio, location, website, software, skills and experience.',
    'What you share: posts (with photos or videos), comments, reposts, stories, projects, critiques, questions, answers, resources, events, job posts, firm pages and messages.',
    'College verification: your college, role and batch year, plus either your college email address (to send a code) or a document you upload.',
  ]],
  ['How we use it', [
    'To run Arcella: showing your profile and posts, delivering messages and notifications, and suggesting people you may know.',
    'To keep college groups private, so only verified members of a college can see its group.',
    'We do not sell your data and we do not show ads.',
  ]],
  ['Who can see what', [
    'Signed-in members can see your profile, public posts, projects, questions and answers. Projects also appear in the public Explore gallery.',
    'College group posts and college-only events are visible only to verified members of that college, and group posts cannot be reposted.',
    'College group chats are visible only to verified members of that college and Arcella admins.',
    'Posts you save are visible only to you.',
    'Stories are visible to your connections and college mates for 24 hours.',
    'Messages are visible only to you and the person you are talking to.',
    'Your email address is never shown to other members.',
  ]],
  ['Verification documents', [
    'ID cards, marksheets and degree certificates can be seen only by Arcella admins and your college\'s admin and co-admin.',
    'They are deleted as soon as your request is approved or rejected.',
  ]],
  ['How long we keep data', ['Stories disappear after 24 hours and notifications after 60 days. Everything else stays until you delete it or your account.']],
  ['Your choices', [
    'Edit or delete your content at any time.',
    'Block members and report content that breaks the rules.',
    'Delete your account in Settings → Delete account. This permanently removes your profile and everything you created.',
  ]],
  ['Security', ['Passwords are hashed with bcrypt and data travels over HTTPS. Data is stored with our hosting providers (MongoDB Atlas, Render and, for uploads, Cloudinary).']],
  ['Who Arcella is for', ['Arcella is for architecture students, graduates, teachers and professionals. It is not meant for children under 16.']],
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Privacy" subtitle="Last updated 1 November 2026" />
      <article className="card space-y-6 p-5 md:p-8">
        <p className="leading-relaxed">Arcella is a professional network for architecture in India. This page explains, in plain words, what we store and who can see it.</p>
        {SECTIONS.map(([title, points]) => (
          <section key={title}>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink/85">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="border-t border-line pt-5 text-sm text-muted">
          Questions or requests? {CONTACT ? <a href={`mailto:${CONTACT}`} className="font-medium text-brand hover:underline">{CONTACT}</a> : 'Contact the site admin.'}
        </p>
      </article>
    </div>
  );
}
