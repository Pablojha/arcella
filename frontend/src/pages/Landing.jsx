import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, BookOpen, Briefcase, FolderOpen, GraduationCap, HandHeart, MessageSquareText, Star } from 'lucide-react';
import Logo from '../components/brand/Logo';
import Wordmark from '../components/brand/Wordmark';
import SiteFooter from '../components/layout/SiteFooter';
import Button from '../components/ui/Button';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTitle } from '../hooks/useTitle';

const FEATURES = [
  { icon: FolderOpen, title: 'Portfolios that get seen', text: 'Pin up projects with up to eight sheets and land in the public Explore gallery.' },
  { icon: MessageSquareText, title: 'Honest crits', text: 'Ask for feedback and get rated on concept, planning, presentation and technical skill.' },
  { icon: GraduationCap, title: 'Private college groups', text: "Verify with your college email or ID to join your batch's members-only space." },
  { icon: Briefcase, title: 'Internships and jobs', text: 'Internships, full-time roles, freelance work and competitions from firms across India.' },
  { icon: HandHeart, title: 'Mentorship', text: 'Book time with alumni and faculty who open up their free slots.' },
  { icon: BookOpen, title: 'Notes and CAD blocks', text: 'Semester-wise notes, sheets, templates and blocks shared by seniors.' },
];

const AUDIENCE = [
  { title: 'Students', text: 'Build a portfolio, find internships, ask the studio-mates you have not met yet.' },
  { title: 'Alumni', text: 'Stay close to your college, mentor juniors, hire from your alma mater.' },
  { title: 'Faculty', text: 'Run college-only juries and workshops, share resources, moderate your group.' },
  { title: 'Firms', text: 'Showcase your work, list open roles and grow a following among young talent.' },
];

const float = (delay) => ({ animate: { y: [0, -8, 0] }, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay } });

function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <motion.div initial={{ opacity: 0, rotate: -12 }} animate={{ opacity: 1, rotate: -6 }} transition={{ duration: 0.8 }} className="card grid-paper absolute inset-8" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="card absolute inset-12 rotate-[3deg] p-5">
        <svg viewBox="0 0 200 160" className="size-full text-ink" aria-hidden>
          <path d="M10 3H190M10 0V6M190 0V6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <rect x="10" y="12" width="180" height="140" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M10 82H90M90 12V60M90 104V152M130 82H190" stroke="currentColor" strokeWidth="3" />
          <path d="M90 60A22 22 0 0 1 112 82M130 82A20 20 0 0 0 150 102" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <rect x="140" y="26" width="34" height="34" fill="var(--brand)" opacity="0.18" />
          <text x="30" y="50" fontSize="9" fill="currentColor" opacity="0.55" fontFamily="var(--font-display)">STUDIO</text>
          <text x="30" y="122" fontSize="9" fill="currentColor" opacity="0.55" fontFamily="var(--font-display)">JURY</text>
          <text x="128" y="128" fontSize="9" fill="currentColor" opacity="0.55" fontFamily="var(--font-display)">COURT</text>
        </svg>
      </motion.div>
      <motion.div {...float(0)} className="absolute left-0 top-6 flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2 text-sm font-medium shadow-lg">
        <BadgeCheck size={16} className="text-brand" /> Verified · CEPT
      </motion.div>
      <motion.div {...float(1.2)} className="absolute bottom-10 right-0 flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2 text-sm font-medium shadow-lg">
        <Star size={16} className="fill-accent text-accent" /> Crit score 4.6
      </motion.div>
      <motion.div {...float(2.4)} className="absolute -bottom-1 left-6 flex items-center gap-2 rounded-2xl bg-brand px-3 py-2 text-sm font-medium text-on-brand shadow-lg">
        <Briefcase size={16} /> Internship offer
      </motion.div>
    </div>
  );
}

export default function Landing() {
  useTitle();
  usePageMeta({ path: '/' });
  const reveal =(index = 0) => ({ initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay: index * 0.06 } });

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 pt-[env(safe-area-inset-top)] md:px-6">
        <span className="flex items-center gap-2">
          <Logo size={32} />
          <Wordmark className="text-2xl" />
        </span>
        <div className="flex gap-1">
          <Button to="/login" variant="ghost" size="sm">
            Log in
          </Button>
          <Button to="/register" size="sm">
            Join free
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-20">
          <div>
            <motion.span {...reveal()} className="chip bg-brand/10 text-brand">
              Made for Indian architecture
            </motion.span>
            <motion.h1 {...reveal(1)} className="mt-4 font-display text-[40px] font-bold leading-[1.05] tracking-tight md:text-6xl">
              Where architects-in-making <span className="text-brand">get seen.</span>
            </motion.h1>
            <motion.p {...reveal(2)} className="mt-5 max-w-lg text-lg text-muted">
              Share portfolios, get crits, find internships and join your college's private group. Built for students, alumni, faculty and firms.
            </motion.p>
            <motion.div {...reveal(3)} className="mt-7 flex flex-wrap gap-3">
              <Button to="/register" size="lg" icon={ArrowRight}>
                Join Arcella
              </Button>
              <Button to="/explore" size="lg" variant="secondary">
                Explore portfolios
              </Button>
            </motion.div>
            <motion.p {...reveal(4)} className="mt-6 text-sm text-muted">
              45+ colleges including SPA Delhi, CEPT, Sir JJ, IIT Roorkee and NIT Trichy.
            </motion.p>
          </div>
          <HeroArt />
        </section>

        <section className="py-10 md:py-16">
          <motion.h2 {...reveal()} className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Everything your studio life needs
          </motion.h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, index) => (
              <motion.div key={title} {...reveal(index)} className="card p-5">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <Icon size={21} />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCE.map(({ title, text }, index) => (
            <motion.div key={title} {...reveal(index)} className="border-l-2 border-accent pl-4">
              <h3 className="font-display text-xl font-semibold">For {title.toLowerCase()}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </motion.div>
          ))}
        </section>

        <motion.section {...reveal()} className="relative my-12 overflow-hidden rounded-3xl bg-brand px-6 py-12 text-center text-on-brand md:py-16">
          <div className="grid-paper absolute inset-0 opacity-30" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Pin up your first project today.</h2>
            <p className="mx-auto mt-3 max-w-md opacity-85">It's free for students, alumni, faculty and firms.</p>
            <Button to="/register" size="lg" variant="secondary" className="mt-6 border-transparent">
              Create your account
            </Button>
          </div>
        </motion.section>
      </main>

      <SiteFooter className="mx-auto max-w-6xl px-4 pb-10 pt-4 md:px-6" />
    </div>
  );
}
