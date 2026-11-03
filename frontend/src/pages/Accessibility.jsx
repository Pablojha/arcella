import LegalPage, { ContactEmail } from '../components/legal/LegalPage';
import { SITE } from '../config/site';
import { usePageMeta } from '../hooks/usePageMeta';

const SECTIONS = [
  {
    id: 'standard',
    title: 'Our standard',
    body: (
      <p>
        We aim for Arcella to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. WCAG is also the basis of the U.S. ADA guidance and of the European standard EN 301 549. Arcella has not had an independent
        accessibility audit yet.
      </p>
    ),
  },
  {
    id: 'testing',
    title: 'How we check',
    body: (
      <ul>
        <li>Every public and members&apos; page is checked automatically with axe-core against WCAG 2.2 A and AA, in light and dark mode, on phone and desktop, every time the code changes. All of them currently pass.</li>
        <li>Every page is checked at ten screen widths, from 320 to 1920 pixels, for content that spills off screen.</li>
        <li>The main journeys (sign up, log in, log out, password reset, the cookie notice) are tested end to end by finding every control through its accessible name and role, the way assistive technology does.</li>
      </ul>
    ),
  },
  {
    id: 'features',
    title: 'What you can expect',
    body: (
      <ul>
        <li>Everything works with a keyboard, with a visible focus outline.</li>
        <li>Buttons, links and form fields have names that screen readers announce, and status messages are announced too.</li>
        <li>Text and controls meet AA colour contrast in light and dark mode, and links in text are underlined.</li>
        <li>Animations follow your device&apos;s &ldquo;reduce motion&rdquo; setting.</li>
        <li>Pages zoom and reflow on small screens without scrolling sideways.</li>
      </ul>
    ),
  },
  {
    id: 'limitations',
    title: 'Known limitations',
    body: (
      <ul>
        <li>Photos that members upload don&apos;t have written descriptions yet, so screen readers can only say who posted them.</li>
        <li>Videos, reels and voice notes don&apos;t have captions or transcripts.</li>
        <li>GIFs come from GIPHY without descriptions.</li>
      </ul>
    ),
  },
  {
    id: 'feedback',
    title: 'Tell us about a problem',
    body: (
      <p>
        If something on Arcella is hard to use with your device or assistive technology, write to <ContactEmail /> with the page and what happened. We will try to fix it, or get you the information another way.
      </p>
    ),
  },
];

export default function Accessibility() {
  usePageMeta({ path: '/accessibility', description: "Arcella's accessibility statement: the WCAG 2.2 AA standard we follow, how we test it, known limitations and how to report a problem." });
  return <LegalPage title="Accessibility Statement" intro={`How accessible ${SITE.name} is, how we check it, and how to tell us about problems.`} sections={SECTIONS} />;
}
