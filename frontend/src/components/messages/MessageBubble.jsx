import { Play, RotateCw } from 'lucide-react';
import { clock, isEmojiOnly } from '../../lib/chat';
import { mediaUrl, videoUrl } from '../../lib/format';
import VoiceNote from './VoiceNote';

/** Instagram rounding: messages in a run from one person share a tighter corner on their side. */
const TIGHT = {
  mine: { first: 'rounded-br-md', middle: 'rounded-r-md', last: 'rounded-tr-md', single: '' },
  theirs: { first: 'rounded-bl-md', middle: 'rounded-l-md', last: 'rounded-tl-md', single: '' },
};
const RING = 2 * Math.PI * 18;

function MediaBubble({ message, corners, onOpen, onRetry }) {
  const { media, status, progress = 0 } = message;
  const ratio = media.width && media.height ? media.width / media.height : 1;
  const poster = media.kind === 'video' && videoUrl(media.url, true);
  return (
    <button
      type="button"
      onClick={status === 'failed' ? onRetry : onOpen}
      aria-label={media.kind === 'video' ? 'Open video' : 'Open photo'}
      style={{ aspectRatio: ratio, width: `min(70vw, 320px, calc(55dvh * ${ratio}))` }}
      className={`relative block overflow-hidden bg-ink/10 ${corners}`}
    >
      {media.kind === 'image' && <img src={mediaUrl(media.url, 640)} alt="" className="size-full object-cover" />}
      {poster && <img src={poster} alt="" className="size-full object-cover" />}
      {media.kind === 'video' && !poster && <video src={videoUrl(media.url)} muted playsInline preload="metadata" className="size-full object-cover" />}
      {media.kind === 'video' && (
        <>
          <span className="absolute inset-0 m-auto grid size-12 place-items-center rounded-full bg-black/45 text-white">
            <Play size={22} className="ml-0.5 fill-current" />
          </span>
          {media.duration > 0 && <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 text-xs font-medium tabular-nums text-white">{clock(media.duration)}</span>}
        </>
      )}
      {status === 'sending' && (
        <span className="absolute inset-0 grid place-items-center bg-black/35">
          <svg viewBox="0 0 44 44" className="size-11 -rotate-90 text-white">
            <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - progress)} className="transition-[stroke-dashoffset]" />
          </svg>
        </span>
      )}
      {status === 'failed' && (
        <span className="absolute inset-0 grid place-items-center bg-black/55 text-sm font-medium text-white">
          <span className="flex flex-col items-center gap-1">
            <RotateCw size={22} /> Tap to retry
          </span>
        </span>
      )}
    </button>
  );
}

/** What a message shows: text (large when it's only 1–3 emoji), a photo or video, a GIF, a voice note or a story reply. */
export default function MessageBubble({ message, mine, position, onOpenMedia, onRetry }) {
  const corners = `rounded-[22px] ${TIGHT[mine ? 'mine' : 'theirs'][position]}`;
  const bubble = mine ? 'bg-brand text-on-brand' : 'bg-ink/[0.07]';

  if (message.media) return <MediaBubble message={message} corners={corners} onOpen={() => onOpenMedia(message)} onRetry={() => onRetry(message)} />;
  if (message.gif) return <img src={message.gif.url} width={message.gif.width} height={message.gif.height} alt="GIF" loading="lazy" className={`h-auto w-[min(60vw,240px)] bg-ink/5 ${corners}`} />;
  if (message.voice) {
    return (
      <div className={`${bubble} ${corners}`}>
        <VoiceNote voice={message.voice} mine={mine} />
      </div>
    );
  }
  if (!message.storyImage && isEmojiOnly(message.text)) return <p className="px-1 text-[44px] leading-tight">{message.text}</p>;
  return (
    <div className={`px-3.5 py-2 text-[15px] leading-snug ${bubble} ${corners}`}>
      {message.storyImage && (
        <span className="mb-1.5 block">
          <span className="mb-1 block text-[11px] opacity-75">{mine ? 'You replied to their story' : 'Replied to your story'}</span>
          <img src={mediaUrl(message.storyImage, 300)} alt="" className="h-28 rounded-xl object-cover" />
        </span>
      )}
      <p className="whitespace-pre-line break-words">{message.text}</p>
    </div>
  );
}
