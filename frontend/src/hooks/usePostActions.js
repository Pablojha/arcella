import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

/** Like, save and share for one post. Likes and saves change at once and roll back if the server refuses. */
export function usePostActions(post) {
  const toast = useToast();
  const [like, setLike] = useState({ active: post.liked, count: post.likesCount });
  const [saved, setSaved] = useState(post.saved);

  const toggleLike = async () => {
    const previous = like;
    setLike({ active: !like.active, count: like.count + (like.active ? -1 : 1) });
    try {
      const result = await api.post(`/posts/${post._id}/like`);
      setLike({ active: result.liked, count: result.likesCount });
    } catch (error) {
      setLike(previous);
      toast.error(error.message);
    }
  };

  const toggleSave = async () => {
    setSaved(!saved);
    try {
      const result = await api.post(`/posts/${post._id}/save`);
      setSaved(result.saved);
      if (result.saved) toast.success('Saved. Find it under More → Saved');
    } catch (error) {
      setSaved(saved);
      toast.error(error.message);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/posts/${post._id}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Arcella', text: post.text?.slice(0, 80), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  return { like, toggleLike, saved, toggleSave, share };
}
