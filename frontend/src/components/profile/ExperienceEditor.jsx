import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash } from 'lucide-react';
import Button from '../ui/Button';

const BLANK = { title: '', org: '', start: '', end: '', description: '' };

export default function ExperienceEditor({ value, onChange }) {
  const update = (index, key, text) => onChange(value.map((item, i) => (i === index ? { ...item, [key]: text } : item)));

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {value.map((item, index) => (
          <motion.div key={item.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="space-y-2 rounded-2xl border border-line p-3">
              <div className="flex gap-2">
                <input value={item.title} onChange={(event) => update(index, 'title', event.target.value)} required maxLength={80} placeholder="Role, e.g. Architectural intern" className="input" />
                <button type="button" aria-label="Remove experience" onClick={() => onChange(value.filter((_, i) => i !== index))} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-accent/10 hover:text-accent">
                  <Trash size={16} />
                </button>
              </div>
              <input value={item.org} onChange={(event) => update(index, 'org', event.target.value)} required maxLength={80} placeholder="Firm or organisation" className="input" />
              <div className="grid grid-cols-2 gap-2">
                <input value={item.start ?? ''} onChange={(event) => update(index, 'start', event.target.value)} maxLength={20} placeholder="From (Jun 2024)" className="input" />
                <input value={item.end ?? ''} onChange={(event) => update(index, 'end', event.target.value)} maxLength={20} placeholder="To (Present)" className="input" />
              </div>
              <textarea value={item.description ?? ''} onChange={(event) => update(index, 'description', event.target.value)} rows={2} maxLength={600} placeholder="What did you work on?" className="input resize-none" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {value.length < 20 && (
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...value, { ...BLANK, key: Date.now() }])}>
          Add experience
        </Button>
      )}
    </div>
  );
}
