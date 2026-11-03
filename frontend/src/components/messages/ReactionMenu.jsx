import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Plus } from 'lucide-react';
import MessageBubble from './MessageBubble';

const QUICK = ['❤️', '😂', '😮', '😢', '😡', '👍'];
const MORE = [
  '😀', '😁', '😆', '🥹', '😅', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😜', '🤪',
  '🤩', '🥳', '😎', '🤓', '🧐', '🤔', '🤗', '🫡', '🤭', '😐', '🙄', '😏', '😬', '😴', '🤯', '😱',
  '😳', '🥺', '😭', '😤', '🤬', '💀', '🤡', '👀', '👏', '🙌', '🫶', '🙏', '🤝', '💪', '✌️', '🤞',
  '👌', '👎', '🔥', '✨', '💯', '🎉', '💚', '💙', '💜', '🖤', '💔', '⭐', '🏛️', '📐', '✏️', '🏗️', '☕',
];
const BAR_HEIGHT = 52;
const BAR_WIDTH = 296;

/**
 * Long-press menu: the message lifts over a dimmed screen with the reaction bar beside it (your current reaction is
 * highlighted; choosing it again removes it). "+" opens more emoji, text messages can be copied, and `actionsFor`
 * adds more ({ label, icon, onClick, danger }), such as Report and Delete in a group. It has no exit fade, because a
 * fading overlay would swallow the next tap.
 */
export default function ReactionMenu({ target, me, onReact, onCopy, actionsFor, onClose }) {
  const [more, setMore] = useState(false);
  if (!target) return null;

  const { message, mine, rect } = target;
  const above = rect.top - BAR_HEIGHT - 12 > 64;
  const bar = { top: above ? rect.top - BAR_HEIGHT - 10 : rect.bottom + 10, left: Math.min(Math.max(8, mine ? rect.right - BAR_WIDTH : rect.left), window.innerWidth - BAR_WIDTH - 8) };
  const listPosition = { top: above ? rect.bottom + 10 : rect.bottom + BAR_HEIGHT + 20, ...(mine ? { right: window.innerWidth - rect.right } : { left: rect.left }) };
  const current = message.reactions?.find((reaction) => reaction.user === me)?.emoji;
  const actions = [message.text && { label: 'Copy', icon: Copy, onClick: () => onCopy(message.text) }, ...(actionsFor?.(message, mine) ?? [])].filter(Boolean);

  const close = () => {
    setMore(false);
    onClose();
  };
  const choose = (emoji) => {
    onReact(message, emoji);
    close();
  };

  return createPortal(
    <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={close} />
      <motion.div
        className={`pointer-events-none absolute flex ${mine ? 'justify-end' : ''}`}
        style={{ top: rect.top, left: rect.left, width: rect.width }}
        animate={{ scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      >
        <MessageBubble message={message} mine={mine} position="single" />
      </motion.div>
      <motion.div
        role="menu"
        aria-label="React to message"
        style={bar}
        initial={{ opacity: 0, scale: 0.85, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 460, damping: 26 }}
        className="absolute flex items-center gap-0.5 rounded-full border border-line bg-card p-1.5 shadow-2xl"
      >
        {QUICK.map((emoji, index) => (
          <motion.button
            key={emoji}
            type="button"
            role="menuitem"
            aria-label={`React with ${emoji}`}
            onClick={() => choose(emoji)}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.02 * index }}
            whileTap={{ scale: 1.35 }}
            className={`grid size-10 place-items-center rounded-full text-[26px] transition hover:bg-ink/5 ${current === emoji ? 'bg-ink/10' : ''}`}
          >
            {emoji}
          </motion.button>
        ))}
        <button type="button" role="menuitem" aria-label="More emoji" onClick={() => setMore(true)} className="grid size-10 place-items-center rounded-full bg-ink/5 text-muted transition hover:bg-ink/10">
          <Plus size={20} />
        </button>
      </motion.div>
      {actions.length > 0 && (
        <motion.div style={listPosition} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="absolute flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
          {actions.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onClick();
                close();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition hover:bg-ink/5 ${danger ? 'text-accent' : ''}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </motion.div>
      )}
      <AnimatePresence>
        {more && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute inset-x-0 bottom-0 max-h-[45dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-card px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
            <div className="grid grid-cols-8 gap-1">
              {MORE.map((emoji) => (
                <button key={emoji} type="button" aria-label={`React with ${emoji}`} onClick={() => choose(emoji)} className="grid aspect-square place-items-center rounded-xl text-2xl transition hover:bg-ink/5 active:scale-110">
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}
