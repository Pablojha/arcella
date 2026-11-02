import Avatar from '../ui/Avatar';
import Sheet from '../ui/Sheet';

/** Who reacted to a message, with which emoji; your own reaction can be removed from here. */
export default function ReactionsSheet({ message, me, other, onRemove, onClose }) {
  const people = { [me._id]: me, ...(other && { [other._id]: other }) };
  return (
    <Sheet open={Boolean(message)} onClose={onClose} title="Reactions">
      <div className="space-y-1 pb-2">
        {message?.reactions?.map((reaction) => {
          const mine = reaction.user === me._id;
          return (
            <button
              key={reaction.user}
              type="button"
              disabled={!mine}
              onClick={() => {
                onRemove(message, reaction.emoji);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition enabled:hover:bg-ink/5"
            >
              <Avatar user={people[reaction.user]} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{mine ? 'You' : people[reaction.user]?.name}</span>
                {mine && <span className="block text-xs text-muted">Tap to remove</span>}
              </span>
              <span className="text-2xl">{reaction.emoji}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
