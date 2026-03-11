import { formatDistanceToNow } from "date-fns";

interface TimeAgoProps {
  date: string;
}

export function TimeAgo({ date }: TimeAgoProps) {
  const parsed = new Date(date);
  const relative = formatDistanceToNow(parsed, { addSuffix: true });
  const absolute = parsed.toLocaleString();

  return (
    <time dateTime={date} title={absolute} className="whitespace-nowrap">
      {relative}
    </time>
  );
}
