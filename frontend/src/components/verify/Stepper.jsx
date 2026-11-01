import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const STEPS = ['College', 'Role & batch', 'Verify'];

export default function Stepper({ step }) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const done = step > number;
        const active = step === number;
        return (
          <li key={label} className={`flex items-center gap-2 ${number < STEPS.length ? 'flex-1' : ''}`}>
            <motion.span animate={{ scale: active ? 1.1 : 1 }} className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${done ? 'bg-brand text-on-brand' : active ? 'bg-ink text-paper' : 'bg-ink/10 text-muted'}`}>
              {done ? <Check size={14} strokeWidth={3} /> : number}
            </motion.span>
            <span className={`whitespace-nowrap text-sm ${active ? 'font-semibold' : 'hidden text-muted sm:inline'}`}>{label}</span>
            {number < STEPS.length && (
              <span className="relative h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-ink/10">
                <motion.span className="absolute inset-0 origin-left bg-brand" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={{ duration: 0.4 }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
