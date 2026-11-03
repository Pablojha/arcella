import LegalPage, { ContactEmail } from '../components/legal/LegalPage';
import { usePageMeta } from '../hooks/usePageMeta';

const SECTIONS = [
  {
    id: 'respect',
    title: 'Respect other people’s work',
    body: (
      <p>
        Architecture drawings, renders, photos, models and writing are protected by copyright. Post only work you created or have permission to share, credit collaborators, and don&apos;t pass off someone else&apos;s design as
        yours.
      </p>
    ),
  },
  {
    id: 'notice',
    title: 'Reporting a copyright problem',
    body: (
      <>
        <p>
          If your work is on Arcella without permission, use <strong>Report → Copyright or IP</strong> on it, or send a notice to <ContactEmail /> with:
        </p>
        <ul>
          <li>your name, address, phone number and email;</li>
          <li>a description of your work (or a link to it);</li>
          <li>the link to the content on Arcella;</li>
          <li>a statement that you believe in good faith the use isn&apos;t authorised by you, your agent or the law;</li>
          <li>a statement that the information is accurate and that you own the rights or may act for the owner;</li>
          <li>your physical or electronic signature.</li>
        </ul>
        <p>This covers what notices under India&apos;s Copyright Act, 1957 and IT Rules, 2021, and under the U.S. DMCA, need to contain.</p>
      </>
    ),
  },
  {
    id: 'what-happens',
    title: 'What happens next',
    body: (
      <ul>
        <li>We review the notice and remove or disable access to the content if it is valid.</li>
        <li>We tell the member who posted it, and pass on the details they need to respond.</li>
        <li>Accounts that repeatedly infringe are closed.</li>
      </ul>
    ),
  },
  {
    id: 'counter',
    title: 'If your content was removed by mistake',
    body: (
      <p>
        Send a counter-notice to <ContactEmail /> with your contact details, the content that was removed and where it was, and a statement that you believe in good faith it was removed by mistake or misidentification. We may
        restore it unless the person who complained tells us they have taken legal action.
      </p>
    ),
  },
  {
    id: 'misuse',
    title: 'Please don’t misuse this',
    body: <p>Knowingly false notices or counter-notices can have legal consequences, and accounts that misuse this process may be closed.</p>,
  },
];

export default function Copyright() {
  usePageMeta({ path: '/copyright', description: 'How to report work used on Arcella without permission, what a notice needs, and how counter-notices work.' });
  return <LegalPage title="Copyright Policy" intro="How Arcella protects creators' work and handles copyright complaints." sections={SECTIONS} />;
}
