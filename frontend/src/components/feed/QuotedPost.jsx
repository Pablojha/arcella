import { Link } from 'react-router-dom';
import { mediaUrl, timeAgo, videoUrl } from '../../lib/format';
import UserChip from '../ui/UserChip';

/** Compact preview of a reposted post that opens it, or a note once the original is gone. */
export default function QuotedPost({ post }) {
  if (!post) return <p className="rounded-2xl border border-line p-3 text-sm text-muted">This post is no longer available.</p>;
  const thumbnail = post.images[0] ? mediaUrl(post.images[0], 240) : videoUrl(post.video, true);

  return (
    <Link to={`/posts/${post._id}`} className="flex gap-3 rounded-2xl border border-line p-3 transition hover:border-ink/25">
      <div className="min-w-0 flex-1 space-y-1.5">
        <UserChip user={post.author} sub={timeAgo(post.createdAt)} size={28} link={false} />
        {post.text && <p className="line-clamp-3 whitespace-pre-line break-words text-sm">{post.text}</p>}
      </div>
      {thumbnail && <img src={thumbnail} alt="" loading="lazy" className="size-16 shrink-0 rounded-xl object-cover" />}
    </Link>
  );
}
