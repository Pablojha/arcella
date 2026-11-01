import { motion } from 'framer-motion';

export default function UploadBar({ progress }) {
  if (!progress) return null;
  const percent = Math.round(progress * 100);
  return (
    <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
        <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${percent}%` }} transition={{ ease: 'easeOut' }} />
      </div>
      <p className="text-xs text-muted">{percent < 100 ? `Uploading ${percent}%` : 'Processing…'}</p>
    </div>
  );
}
