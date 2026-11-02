import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { clock } from '../../lib/chat';
import { audioUrl } from '../../lib/format';
import { playExclusive } from '../../lib/media';

const FLAT = Array.from({ length: 32 }, () => 0.3);

/** A voice note: play/pause, a waveform that fills as it plays (tap it to jump there) and the time left. */
export default function VoiceNote({ voice, mine }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const bars = voice.waveform?.length ? voice.waveform : FLAT;
  const length = voice.duration || 0;
  const progress = length ? Math.min(1, position / length) : 0;

  const toggle = () => (audio.current.paused ? audio.current.play().catch(() => {}) : audio.current.pause());
  const seek = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    audio.current.currentTime = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * length;
    if (audio.current.paused) audio.current.play().catch(() => {});
  };

  return (
    <div className="flex w-60 items-center gap-2.5 px-3 py-2">
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause voice message' : 'Play voice message'} className="grid size-8 shrink-0 place-items-center">
        {playing ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
      </button>
      <div role="slider" aria-label="Voice message position" aria-valuemin={0} aria-valuemax={Math.round(length)} aria-valuenow={Math.round(position)} onClick={seek} className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2px]">
        {bars.map((level, index) => (
          <span
            key={index}
            style={{ height: `${Math.max(14, level * 100)}%` }}
            className={`w-[3px] flex-1 rounded-full transition-colors ${index / bars.length < progress ? (mine ? 'bg-on-brand' : 'bg-ink') : mine ? 'bg-on-brand/40' : 'bg-ink/25'}`}
          />
        ))}
      </div>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums opacity-80">{clock(playing || position ? length - position : length)}</span>
      <audio
        ref={audio}
        src={audioUrl(voice.url)}
        preload="metadata"
        onPlay={(event) => {
          playExclusive(event.currentTarget);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPosition(0)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      />
    </div>
  );
}
