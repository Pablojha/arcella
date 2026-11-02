import { useEffect, useRef, useState } from 'react';
import { Camera, Image, Mic, Play, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { clock, measureMedia, waveformOf } from '../../lib/chat';
import { compressImage } from '../../lib/files';
import GifSheet from './GifSheet';

const MAX_FILES = 10;
const MB = 1024 * 1024;
const TYPING_EVERY_MS = 2500;
const CANCEL_DISTANCE = 80;
const EXTENSIONS = { 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' };
const precisePointer = window.matchMedia('(pointer: fine)').matches;

/**
 * The message bar, pinned to the bottom like Instagram: a camera button, a text box that grows to five lines, and mic,
 * gallery and GIF buttons that turn into Send once there is something to send. Hold the mic to record; slide left to cancel.
 */
export default function ChatComposer({ onSend, onTyping }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]);
  const [gifsOpen, setGifsOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const input = useRef(null);
  const picker = useRef(null);
  const lastTyping = useRef(0);
  const pressX = useRef(0);
  const recorder = useVoiceRecorder({
    onRecorded: async (blob, duration) => {
      const type = blob.type.split(';')[0];
      onSend({ kind: 'voice', file: new File([blob], `voice.${EXTENSIONS[type] ?? 'webm'}`, { type }), url: URL.createObjectURL(blob), duration, waveform: await waveformOf(blob) });
    },
    onTooShort: () => toast.info('Hold to record'),
    onDenied: (error) =>
      toast.error(error.name === 'NotAllowedError' ? 'Microphone access is blocked. Allow it in your browser or phone settings to send voice notes.' : 'Could not start the microphone on this device.'),
  });
  const hasContent = Boolean(text.trim() || picked.length);

  useEffect(() => {
    const box = input.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 124)}px`;
  }, [text]);

  const changeText = (value) => {
    setText(value);
    if (value && Date.now() - lastTyping.current > TYPING_EVERY_MS) {
      lastTyping.current = Date.now();
      onTyping(true);
    } else if (!value && lastTyping.current) {
      lastTyping.current = 0;
      onTyping(false);
    }
  };

  const pick = async (event) => {
    const files = [...event.target.files];
    event.target.value = '';
    if (picked.length + files.length > MAX_FILES) toast.info(`You can send up to ${MAX_FILES} photos and videos at a time`);
    const ready = [];
    for (const original of files.slice(0, MAX_FILES - picked.length)) {
      const video = original.type.startsWith('video/');
      const file = video ? original : await compressImage(original);
      if (file.size > (video ? 40 : 8) * MB) toast.error(video ? `${original.name} is over 40 MB` : `${original.name} is over 8 MB`);
      else ready.push({ file, ...(await measureMedia(file)) });
    }
    setPicked((current) => [...current, ...ready]);
  };

  const remove = (item) => {
    URL.revokeObjectURL(item.url);
    setPicked((current) => current.filter((entry) => entry !== item));
  };

  const send = (event) => {
    event?.preventDefault();
    if (!hasContent) return;
    picked.forEach((item) => onSend(item));
    if (text.trim()) onSend({ kind: 'text', text: text.trim() });
    setPicked([]);
    setText('');
    lastTyping.current = 0;
    onTyping(false);
  };

  const icon = 'grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-ink/5';

  return (
    <div className="shrink-0 border-t border-line bg-card px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 in-data-keyboard:pb-2 md:px-4">
      {picked.length > 0 && (
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          {picked.map((item) => (
            <div key={item.url} className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-ink/10">
              {item.kind === 'video' ? <video src={item.url} muted playsInline preload="metadata" className="size-full object-cover" /> : <img src={item.url} alt="" className="size-full object-cover" />}
              {item.kind === 'video' && (
                <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] tabular-nums text-white">
                  <Play size={9} className="fill-current" />
                  {clock(item.duration)}
                </span>
              )}
              <button type="button" aria-label="Remove" onClick={() => remove(item)} className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={send} className="flex items-end gap-1.5 rounded-[26px] bg-ink/[0.06] p-1.5">
        <button type="button" aria-label="Send a photo or video" onClick={() => picker.current.click()} className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
          <Camera size={18} />
        </button>
        {recorder.recording ? (
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 px-1 text-sm">
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-alert" />
            <span className="tabular-nums">{clock(recorder.seconds)}</span>
            <span className={`ml-auto truncate ${cancelling ? 'font-semibold text-alert' : 'text-muted'}`}>{cancelling ? 'Release to cancel' : '‹ Slide to cancel'}</span>
          </div>
        ) : (
          <textarea
            ref={input}
            value={text}
            onChange={(event) => changeText(event.target.value)}
            onKeyDown={(event) => precisePointer && event.key === 'Enter' && !event.shiftKey && send(event)}
            rows={1}
            maxLength={2000}
            placeholder="Message…"
            aria-label="Message"
            className="min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1 py-[7px] text-[15px] leading-[22px] outline-none placeholder:text-muted"
          />
        )}
        {hasContent && !recorder.recording ? (
          <button type="submit" onPointerDown={(event) => event.preventDefault()} className="h-9 shrink-0 px-3 text-[15px] font-bold text-brand">
            Send
          </button>
        ) : (
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label="Hold to record a voice message"
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                pressX.current = event.clientX;
                setCancelling(false);
                recorder.start();
              }}
              onPointerMove={(event) => recorder.recording && setCancelling(event.clientX - pressX.current < -CANCEL_DISTANCE)}
              onPointerUp={() => recorder.stop(!cancelling)}
              onPointerCancel={() => recorder.stop(false)}
              onContextMenu={(event) => event.preventDefault()}
              className={`${icon} touch-none select-none ${recorder.recording ? 'scale-125 bg-alert text-on-alert hover:bg-alert' : ''}`}
            >
              <Mic size={22} />
            </button>
            {!recorder.recording && (
              <>
                <button type="button" aria-label="Choose photos or videos" onClick={() => picker.current.click()} className={icon}>
                  <Image size={22} />
                </button>
                <button type="button" aria-label="Send a GIF" onClick={() => setGifsOpen(true)} className={icon}>
                  <span className="rounded-md border-2 border-current px-1 text-[10px] font-extrabold leading-4">GIF</span>
                </button>
              </>
            )}
          </div>
        )}
        <input ref={picker} type="file" accept="image/*,video/*" multiple hidden onChange={pick} />
      </form>
      <GifSheet open={gifsOpen} onClose={() => setGifsOpen(false)} onPick={(gif) => onSend({ kind: 'gif', gif: { url: gif.url, width: gif.width, height: gif.height } })} />
    </div>
  );
}
