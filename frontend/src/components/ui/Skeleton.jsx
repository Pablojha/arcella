export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3, lines = 2 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} lines={lines} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6, className = 'grid-cols-2 md:grid-cols-3' }) {
  return (
    <div className={`grid gap-3 md:gap-4 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card overflow-hidden">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
