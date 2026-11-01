import { useEffect, useRef } from 'react';

/** Invisible sentinel that loads the next page as it nears the viewport. */
export default function LoadMore({ hasMore, loading, onLoad }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!hasMore || loading || !ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onLoad(), { rootMargin: '400px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoad]);

  return <div ref={ref} className="h-px" />;
}
