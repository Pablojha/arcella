import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import Wordmark from '../brand/Wordmark';

/** Brand panel on large screens, centred form column everywhere; used by login, register and password reset. */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-on-brand lg:flex lg:flex-col lg:justify-between">
        <div className="grid-paper absolute inset-0 opacity-25" />
        <Link to="/" className="relative flex items-center gap-2">
          <Logo size={36} />
          <Wordmark className="text-2xl" />
        </Link>
        <motion.blockquote initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative max-w-md">
          <p className="font-display text-3xl font-semibold leading-snug">“Architecture is the learned game, correct and magnificent, of forms assembled in the light.”</p>
          <footer className="mt-4 opacity-80">Le Corbusier</footer>
        </motion.blockquote>
        <p className="relative text-sm opacity-80">Portfolios · crits · college groups · internships</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <Logo size={36} />
            <Wordmark className="text-2xl" />
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          {children}
        </motion.div>
      </main>
    </div>
  );
}
