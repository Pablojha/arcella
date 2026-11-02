import { MessagesSquare } from 'lucide-react';
import { useParams } from 'react-router-dom';
import ConversationList from '../components/messages/ConversationList';
import Thread from '../components/messages/Thread';
import { useMedia } from '../hooks/useMedia';
import { useTitle } from '../hooks/useTitle';

/** Phones: the chat list, or one chat full screen. Desktop: list and chat side by side. */
export default function Messages() {
  const { userId } = useParams();
  const desktop = useMedia('(min-width: 768px)');
  useTitle('Messages');
  return (
    <div className="md:grid md:h-[calc(100dvh-8.5rem)] md:grid-cols-[320px_minmax(0,1fr)] md:overflow-hidden md:rounded-[1.25rem] md:border md:border-line md:bg-card">
      {(desktop || !userId) && (
        <div className="flex min-h-0 flex-col md:border-r md:border-line">
          <ConversationList activeId={userId} />
        </div>
      )}
      {(desktop || userId) && (
        <div className="flex min-h-0 flex-col">
          {userId ? (
            <Thread key={userId} userId={userId} />
          ) : (
            <div className="m-auto flex flex-col items-center px-6 text-center text-muted">
              <MessagesSquare size={36} className="mb-3" />
              <p className="font-medium text-ink">Your messages</p>
              <p className="mt-1 max-w-xs text-sm">Pick a conversation, or start one with a connection or verified batchmate.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
