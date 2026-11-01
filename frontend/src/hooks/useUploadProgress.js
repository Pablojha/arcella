import { useMemo, useState } from 'react';

/** Upload progress (0–1) for an axios request: pass `config` as the request config. */
export function useUploadProgress() {
  const [progress, setProgress] = useState(0);
  const config = useMemo(() => ({ onUploadProgress: ({ loaded, total }) => setProgress(total ? loaded / total : 0) }), []);
  return { progress, config, reset: () => setProgress(0) };
}
