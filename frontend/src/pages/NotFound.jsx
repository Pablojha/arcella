import { motion } from 'framer-motion';
import Logo from '../components/brand/Logo';
import Button from '../components/ui/Button';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTitle } from '../hooks/useTitle';

export default function NotFound() {
  useTitle('Page not found');
  usePageMeta({ description: "This page doesn't exist on Arcella.", noindex: true });
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <motion.div initial={{ rotate: -12, scale: 0.8, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
        <Logo size={72} />
      </motion.div>
      <p className="mt-6 font-mono text-sm tracking-widest text-muted">ERROR 404</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">This sheet isn't in the set</h1>
      <p className="mt-2 max-w-sm text-muted">The page you're looking for was moved, deleted or never drawn.</p>
      <Button to="/" size="lg" className="mt-6">
        Back to home
      </Button>
    </div>
  );
}
