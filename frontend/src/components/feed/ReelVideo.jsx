import { useState } from 'react';
import { Clapperboard, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReelSound } from '../../hooks/useReelSound';
import BigHeart from './BigHeart';
import ReelPlayer from './ReelPlayer';

/**
 * A video post in the feed, reel-shaped (9:16, cropped to fit the screen's height): it plays muted while mostly on
 * screen (not with Data Saver on), and the speaker button turns sound on for every reel. Tap opens the full-screen
 * Reels viewer at this post; double-tap likes.
 */
export default function ReelVideo({ post, onDoubleTap }) {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useReelSound();
  const [heart, setHeart] = useState(0);

  return (
    // Short enough that the reel, its author and its sound button fit between the app's top and bottom bars.
    <div className="relative aspect-[9/16] max-h-[calc(100dvh-11rem)] w-full overflow-hidden bg-black">
      <ReelPlayer
        src={post.video}
        muted={!soundOn}
        threshold={0.6}
        autoPlay={!navigator.connection?.saveData}
        preload="none"
        onSoundBlocked={() => setSoundOn(false)}
        onTap={() => navigate(`/reels?start=${post._id}`)}
        onDoubleTap={() => {
          setHeart((value) => value + 1);
          onDoubleTap();
        }}
      />
      <span className="chip pointer-events-none absolute left-3 top-3 bg-black/45 text-white backdrop-blur-sm">
        <Clapperboard size={12} /> Reel
      </span>
      <button type="button" aria-label={soundOn ? 'Mute' : 'Unmute'} onClick={() => setSoundOn(!soundOn)} className="absolute bottom-4 right-3 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
        {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
      </button>
      <BigHeart burst={heart} onDone={() => setHeart(0)} />
    </div>
  );
}
