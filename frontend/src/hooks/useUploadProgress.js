import { useMemo, useState } from 'react';

/** Upload progress (0–1) for an axios request: pass `config` as the request config. Uploads get 15 minutes, not the usual timeout. */
export function useUploadProgress() {
  const [progress, setProgress] = useState(0);
  const config = useMemo(() => ({ timeout: 15 * 60_000, onUploadProgress: ({ loaded, total }) => setProgress(total ? loaded / total : 0) }), []);
  return { progress, config, reset: () => setProgress(0) };
}
