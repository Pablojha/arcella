import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import Button from './Button';

/** Whether the server has the AI assistant switched on (it needs an API key there). */
export const useAiEnabled = () => Boolean(useApi('/ai/status').data?.enabled);

/**
 * A button that runs one AI request and hands the result to `onResult`. It renders nothing while the AI assistant is
 * switched off, so no member ever sees a control that can't work.
 */
export default function AiButton({ request, onResult, children, ...props }) {
  const enabled = useAiEnabled();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;

  const run = async () => {
    setBusy(true);
    try {
      onResult(await request());
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" icon={Sparkles} loading={busy} onClick={run} {...props}>
      {children}
    </Button>
  );
}
