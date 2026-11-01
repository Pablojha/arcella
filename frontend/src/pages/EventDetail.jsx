import { CalendarPlus, CalendarX, Check, Clock, ExternalLink, Lock, MapPin, Trash, Video } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import DateTile from '../components/events/DateTile';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import UserChip from '../components/ui/UserChip';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import api from '../lib/api';
import { EVENT_TYPES } from '../lib/constants';
import { calendarUrl, formatDate, formatTime, labelOf, mediaUrl } from '../lib/format';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: event, setData, loading, error } = useApi(`/events/${id}`);

  if (loading) return <Skeleton className="mx-auto h-96 max-w-3xl rounded-3xl" />;
  if (error) return <EmptyState icon={CalendarX} title="Event not available" text={error.message} />;

  const rsvp = async () => {
    try {
      const result = await api.post(`/events/${id}/rsvp`);
      setData((current) => ({ ...current, ...result }));
      if (result.going) toast.success("You're going! Add it to your calendar so you don't miss it.");
    } catch (rsvpError) {
      toast.error(rsvpError.message);
    }
  };

  const remove = async () => {
    if (!window.confirm('Cancel and delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted');
      navigate('/events', { replace: true });
    } catch (removeError) {
      toast.error(removeError.message);
    }
  };

  const past = new Date(event.end) < new Date();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={labelOf(EVENT_TYPES, event.type)} back="/events" />
      <article className="card overflow-hidden">
        {event.cover ? <img src={mediaUrl(event.cover, 1200)} alt="" className="max-h-80 w-full object-cover" /> : <div className="grid-paper h-28 bg-brand/10" />}
        <div className="space-y-5 p-5 md:p-7">
          <div className="flex items-start gap-4">
            <DateTile date={event.start} />
            <div className="min-w-0">
              {event.college && (
                <span className="chip mb-1.5 bg-accent/10 text-accent">
                  <Lock size={11} /> Only for {event.college.short ?? event.college.name}
                </span>
              )}
              <h1 className="font-display text-2xl font-bold leading-tight tracking-tight">{event.title}</h1>
            </div>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <Clock size={16} className="shrink-0 text-muted" />
              {formatDate(event.start, { weekday: 'short', day: 'numeric', month: 'short' })}, {formatTime(event.start)} – {formatTime(event.end)}
            </p>
            <p className="flex min-w-0 items-center gap-2">
              {event.online ? <Video size={16} className="shrink-0 text-muted" /> : <MapPin size={16} className="shrink-0 text-muted" />}
              {event.online ? (
                <a href={event.link} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1 text-brand hover:underline">
                  <span className="truncate">Join online</span> <ExternalLink size={13} />
                </a>
              ) : (
                <span className="truncate">{event.venue}</span>
              )}
            </p>
          </div>
          {event.description && <p className="whitespace-pre-line break-words leading-relaxed">{event.description}</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
            {!past && (
              <Button variant={event.going ? 'secondary' : 'primary'} icon={event.going ? Check : undefined} onClick={rsvp}>
                {event.going ? 'Going' : 'RSVP'}
              </Button>
            )}
            <Button href={calendarUrl(event)} variant="secondary" icon={CalendarPlus}>
              Google Calendar
            </Button>
            <span className="text-sm text-muted">{event.attendeesCount} going</span>
            {(event.host?._id === user._id || user.isAdmin) && (
              <Button variant="danger" icon={Trash} onClick={remove} className="ml-auto">
                Delete
              </Button>
            )}
          </div>
          <UserChip user={event.host} sub="Host" size={36} />
        </div>
      </article>
    </div>
  );
}
