import Button from '../components/ui/Button';
import LegalPage, { ContactEmail } from '../components/legal/LegalPage';
import { usePageMeta } from '../hooks/usePageMeta';
import { openStorageSettings } from '../lib/consent';

const STORED = [
  ['arcella_token', 'Essential', 'Keeps you signed in', 'Until you log out, or 30 days'],
  ['arcella_user', 'Essential', 'Shows your profile at once while the app loads', 'Until you log out'],
  ['arcella_storage_choice', 'Essential', 'Remembers your answer to the cookie notice', 'Until you clear site data'],
  ['arcella_splash_seen', 'Essential', 'Shows the opening animation once per visit', 'Until you close the tab'],
  ['Offline cache', 'Essential', 'Loads the app quickly and when you are offline', 'Replaced with each update'],
  ['arcella_theme', 'Preference', 'Remembers light or dark mode', 'Until you change it'],
  ['arcella_install_dismissed', 'Preference', 'Remembers that you closed the "install the app" tip', 'Until you clear site data'],
  ['arcella_push_prompt_dismissed', 'Preference', 'Waits before suggesting notifications again', '14 days'],
];

const SECTIONS = [
  {
    id: 'summary',
    title: 'The short version',
    body: (
      <p>
        Arcella&apos;s code doesn&apos;t set cookies, and it uses no advertising or analytics trackers. It keeps a few things in your browser&apos;s storage so the app works, and remembers preferences only if you allow it.
      </p>
    ),
  },
  {
    id: 'list',
    title: 'Everything Arcella stores in your browser',
    body: (
      <>
        {/* Phones get one card per item; wider screens get the table. */}
        <ul className="!list-none space-y-2.5 !pl-0 sm:hidden">
          {STORED.map(([name, type, purpose, duration]) => (
            <li key={name} className="rounded-2xl border border-line p-3 !pl-3">
              <p className="flex items-center justify-between gap-2">
                <span className="break-all font-mono text-xs">{name}</span>
                <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium">{type}</span>
              </p>
              <p className="mt-1 text-sm">{purpose}</p>
              <p className="text-xs text-muted">{duration}</p>
            </li>
          ))}
        </ul>
        <table className="hidden w-full text-left text-sm sm:table">
          <caption className="sr-only">Items Arcella stores in your browser</caption>
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Type</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Purpose</th>
              <th scope="col" className="py-2 font-semibold">How long</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {STORED.map(([name, type, purpose, duration]) => (
              <tr key={name}>
                <td className="py-2 pr-3 font-mono text-xs">{name}</td>
                <td className="py-2 pr-3">{type}</td>
                <td className="py-2 pr-3">{purpose}</td>
                <td className="py-2">{duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Content from other services',
    body: <p>Photos, videos and voice notes load from Cloudinary, and GIFs from GIPHY. Those requests send your IP address and browser details to them. Arcella embeds no advertising, analytics or social media trackers.</p>,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    body: <p>If you turn on notifications, your browser keeps a push subscription for Arcella. Turn it off at any time in Settings → Notifications.</p>,
  },
  {
    id: 'control',
    title: 'Your choices',
    body: (
      <>
        <p>Essential storage is needed for Arcella to work. Preferences are remembered across visits only if you allow it; otherwise they last until you close the tab. Logging out removes your session, and clearing your browser&apos;s site data removes everything.</p>
        <Button size="sm" variant="secondary" onClick={openStorageSettings}>
          Cookie settings
        </Button>
        <p>
          Questions: <ContactEmail />.
        </p>
      </>
    ),
  },
];

export default function Cookies() {
  usePageMeta({ path: '/cookies', description: 'Arcella uses no advertising or analytics cookies. See everything it keeps in your browser and change your choice.' });
  return <LegalPage title="Cookie Policy" intro="What Arcella keeps in your browser, why, and for how long." sections={SECTIONS} />;
}
