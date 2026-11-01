import { motion } from 'framer-motion';

const COLORS = ['#1d6b47', '#c2522b', '#e9b949', '#5bbf8e', '#7a6f5e'];
const PIECES = Array.from({ length: 56 }, (_, index) => ({
  x: (Math.random() - 0.5) * 720,
  y: -(Math.random() * 360 + 180),
  rotate: Math.random() * 720 - 360,
  delay: Math.random() * 0.2,
  color: COLORS[index % COLORS.length],
  round: index % 3 === 0,
}));

export default function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {PIECES.map((piece, index) => (
        <motion.span
          key={index}
          className={`absolute left-1/2 top-1/2 ${piece.round ? 'size-2 rounded-full' : 'h-3 w-1.5 rounded-sm'}`}
          style={{ backgroundColor: piece.color }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: piece.x, y: [0, piece.y, piece.y + 900], rotate: piece.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: 2.6, delay: piece.delay, ease: 'easeOut', times: [0, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
