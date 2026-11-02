import { useEffect, useRef, useState } from 'react';

const TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];

/**
 * Hold-to-record voice notes. `start()` opens the microphone; `stop(true)` hands the recording to `onRecorded`
 * (anything under a second goes to `onTooShort`), `stop(false)` throws it away. Letting go before the microphone
 * opened counts as too short.
 */
export function useVoiceRecorder({ onRecorded, onTooShort, onDenied }) {
  const [seconds, setSeconds] = useState(null);
  const session = useRef(null);

  const start = async () => {
    const current = { released: false, chunks: [] };
    session.current = current;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      session.current = null;
      onDenied(error);
      return;
    }
    if (current.released) {
      session.current = null;
      stream.getTracks().forEach((track) => track.stop());
      onTooShort();
      return;
    }
    const type = TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    recorder.ondataavailable = (event) => current.chunks.push(event.data);
    Object.assign(current, { stream, recorder, startedAt: Date.now(), timer: setInterval(() => setSeconds((Date.now() - current.startedAt) / 1000), 200) });
    recorder.start();
    setSeconds(0);
  };

  const stop = (send) => {
    const current = session.current;
    if (!current) return;
    current.released = true;
    if (!current.recorder) return;
    session.current = null;
    clearInterval(current.timer);
    setSeconds(null);
    const duration = (Date.now() - current.startedAt) / 1000;
    current.recorder.onstop = () => {
      current.stream.getTracks().forEach((track) => track.stop());
      if (!send) return;
      if (duration < 1) onTooShort();
      else onRecorded(new Blob(current.chunks, { type: current.recorder.mimeType }), duration);
    };
    current.recorder.stop();
  };

  // Leaving the chat mid-recording releases the microphone.
  useEffect(
    () => () => {
      const current = session.current;
      clearInterval(current?.timer);
      current?.stream?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  return { recording: seconds !== null, seconds: seconds ?? 0, start, stop };
}
