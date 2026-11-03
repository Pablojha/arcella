import LegalPage, { ContactEmail, Missing } from '../components/legal/LegalPage';
import { usePageMeta } from '../hooks/usePageMeta';

const SECTIONS = [
  {
    id: 'free',
    title: 'Arcella is free',
    body: <p>Arcella doesn&apos;t sell subscriptions, paid features or anything else today. It never asks for card or bank details, so no payments are taken and there is nothing to refund.</p>,
  },
  {
    id: 'scams',
    title: 'If someone asks you to pay',
    body: <p>If anyone asks you to pay for Arcella verification, job listings or any other feature, it isn&apos;t us. Please report the member and don&apos;t pay.</p>,
  },
  {
    id: 'future',
    title: 'Paid features in the future',
    body: (
      <p>
        <Missing>refund terms, if paid features are ever introduced</Missing>
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions: <ContactEmail />.
      </p>
    ),
  },
];

export default function Refunds() {
  usePageMeta({ path: '/refunds', description: 'Arcella is free: it takes no payments, so there is nothing to refund. What to do if someone asks you to pay.' });
  return <LegalPage title="Refund Policy" intro="How payments and refunds work on Arcella." sections={SECTIONS} />;
}
