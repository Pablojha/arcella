import { useToast } from '../context/ToastContext';
import api from '../lib/api';

/** Returns `toggle(person, isBlocked)`; it confirms before blocking and resolves to the new state (null if cancelled). */
export function useBlock() {
  const toast = useToast();
  return async (person, isBlocked = false) => {
    const prompt = `Block ${person.name}? You won't see each other's posts or stories, and they can't message or connect with you.`;
    if (!isBlocked && !window.confirm(prompt)) return null;
    try {
      const { blocked } = await api.post(`/users/${person._id}/block`);
      toast.success(`${person.name.split(' ')[0]} is ${blocked ? 'blocked' : 'unblocked'}`);
      return blocked;
    } catch (error) {
      toast.error(error.message);
      return null;
    }
  };
}
