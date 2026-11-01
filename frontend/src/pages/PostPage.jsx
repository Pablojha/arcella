import { FileX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import PostCard from '../components/feed/PostCard';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useApi } from '../hooks/useApi';

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: post, loading, error } = useApi(`/posts/${id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Post" back="/" />
      {loading && <CardSkeleton lines={4} />}
      {error && <EmptyState icon={FileX} title="Post not available" text={error.message} />}
      {post && <PostCard post={post} showComments onDeleted={() => navigate('/', { replace: true })} />}
    </div>
  );
}
