import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LoaderCircle } from 'lucide-react';
import { separatorLabel, startsNewSection } from '../../lib/chat';
import Avatar from '../ui/Avatar';
import MessageBubble from './MessageBubble';

function TypingDots({ user }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-end gap-2">
      <Avatar user={user} size={28} />
      <div className="flex gap-1 rounded-[22px] bg-ink/[0.07] px-4 py-3.5" aria-label={`${user?.name} is typing`}>
        {[0, 1, 2].map((dot) => (
          <motion.span key={dot} className="size-2 rounded-full bg-muted" animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }} />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * The conversation, newest at the bottom: runs of messages from one person (their photo only by the last one), a time
 * label after gaps over 15 minutes, "Seen" under your last read message, typing dots, and older messages on scroll up.
 */
export default function MessageList({ items, me, other, seenUntil, typing, hasMore, onLoadOlder, onOpenMedia, onRetry }) {
  const scroller = useRef(null);
  const sentinel = useRef(null);
  const atBottom = useRef(true);
  const heightBeforeOlder = useRef(null);
  const firstId = items[0]?._id;
  const lastId = items.at(-1)?._id;
  const lastMine = items.findLast((message) => message.from === me && !message.status);
  const seen = lastMine && seenUntil && lastMine._id <= seenUntil;

  // Older messages arrived on top: keep the reader's place.
  useLayoutEffect(() => {
    const box = scroller.current;
    if (heightBeforeOlder.current == null || !box) return;
    box.scrollTop += box.scrollHeight - heightBeforeOlder.current;
    heightBeforeOlder.current = null;
  }, [firstId]);

  // A new message or typing dots: follow them if the reader was at the bottom or sent the message.
  const lastFromMe = items.at(-1)?.from === me;
  useLayoutEffect(() => {
    const box = scroller.current;
    if (box && (atBottom.current || lastFromMe)) box.scrollTop = box.scrollHeight;
  }, [lastId, typing, lastFromMe]);

  useEffect(() => {
    if (!hasMore || !sentinel.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || heightBeforeOlder.current != null) return;
        heightBeforeOlder.current = scroller.current.scrollHeight;
        onLoadOlder().catch(() => {
          heightBeforeOlder.current = null;
        });
      },
      { root: scroller.current, rootMargin: '300px 0px 0px 0px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadOlder]);

  return (
    <div
      ref={scroller}
      onScroll={(event) => {
        const box = event.currentTarget;
        atBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 150;
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 md:px-5"
    >
      {hasMore && (
        <div ref={sentinel} className="grid place-items-center py-3 text-muted">
          <LoaderCircle size={18} className="animate-spin" />
        </div>
      )}
      {items.map((message, index) => {
        const previous = items[index - 1];
        const following = items[index + 1];
        const mine = message.from === me;
        const section = startsNewSection(previous, message);
        const joinsPrevious = !section && previous.from === message.from;
        const joinsNext = Boolean(following) && following.from === message.from && !startsNewSection(message, following);
        const position = joinsPrevious ? (joinsNext ? 'middle' : 'last') : joinsNext ? 'first' : 'single';
        const note = message.status === 'failed' ? 'Not sent. Tap to retry' : message.status === 'sending' && !message.media ? 'Sending…' : '';
        return (
          <Fragment key={message._id}>
            {section && <p className="pb-1 pt-4 text-center text-xs font-medium text-muted">{separatorLabel(message.createdAt)}</p>}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 ${mine ? 'justify-end' : ''} ${joinsPrevious ? 'mt-0.5' : 'mt-2'}`}>
              {!mine && (joinsNext ? <span className="w-7 shrink-0" /> : <Avatar user={other} size={28} />)}
              <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <MessageBubble message={message} mine={mine} position={position} onOpenMedia={onOpenMedia} onRetry={onRetry} />
                {note && (
                  <button type="button" disabled={message.status !== 'failed'} onClick={() => onRetry(message)} className={`mt-1 px-1 text-[11px] ${message.status === 'failed' ? 'font-medium text-alert' : 'text-muted'}`}>
                    {note}
                  </button>
                )}
              </div>
            </motion.div>
            {message === lastMine && seen && <p className="mt-1 pr-1 text-right text-[11px] text-muted">Seen</p>}
          </Fragment>
        );
      })}
      {typing && <TypingDots user={other} />}
    </div>
  );
}
