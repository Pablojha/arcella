import { useToast } from '../context/ToastContext';
import api from '../lib/api';

/**
 * Pin, hide and unhide chats (for you only). `onChange(userId, { pinned, hidden })` runs after each change, and a
 * `chats:changed` window event lets the chat list refresh wherever the change was made. Hiding offers Undo for
 * 5 seconds, which also restores the pin a hidden chat loses.
 */
export function useChatSettings(onChange) {
  const toast = useToast();

  const update = async (userId, changes) => {
    try {
      const state = await api.patch(`/messages/${userId}/state`, changes);
      onChange?.(userId, state);
      window.dispatchEvent(new Event('chats:changed'));
      return state;
    } catch (error) {
      toast.error(error.message);
      return null;
    }
  };

  const hide = async (userId, wasPinned) => {
    const state = await update(userId, { hidden: true });
    if (state) toast.info('Chat hidden', { duration: 5000, action: { label: 'Undo', onClick: () => update(userId, { hidden: false, ...(wasPinned && { pinned: true }) }) } });
    return state;
  };

  return { pin: (userId, pinned) => update(userId, { pinned }), hide, unhide: (userId) => update(userId, { hidden: false }) };
}
