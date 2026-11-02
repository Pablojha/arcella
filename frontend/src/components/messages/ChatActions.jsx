import { Eye, EyeOff, Pin, PinOff } from 'lucide-react';
import Sheet from '../ui/Sheet';

/** Long-press options for a chat in the list: pin or unpin it, hide it, or unhide it from the hidden list. */
export default function ChatActions({ chat, onPin, onHide, onUnhide, onClose }) {
  const options = chat?.hidden
    ? [{ icon: Eye, label: 'Unhide', run: onUnhide }]
    : [
        { icon: chat?.pinned ? PinOff : Pin, label: chat?.pinned ? 'Unpin' : 'Pin', run: onPin },
        { icon: EyeOff, label: 'Hide chat', run: onHide },
      ];

  return (
    <Sheet open={Boolean(chat)} onClose={onClose} title={chat?.user.name ?? ''}>
      <div className="space-y-1 pb-2">
        {options.map(({ icon: Icon, label, run }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              run(chat);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-2xl p-3 text-left font-medium transition hover:bg-ink/5"
          >
            <Icon size={20} className="text-muted" />
            {label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
