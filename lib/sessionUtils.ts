import type { Timestamp } from 'firebase/firestore';
import type { SessionType } from './sessions';

export function getSessionName(startedAt: Timestamp, type?: SessionType): string {
  const hour = startedAt.toDate().getHours();
  const period =
    hour >= 5 && hour < 12 ? 'Morning'
    : hour >= 12 && hour < 17 ? 'Afternoon'
    : hour >= 17 && hour < 21 ? 'Evening'
    : 'Night';
  const activity =
    type === 'run' ? 'Run'
    : type === 'bike' ? 'Ride'
    : type === 'drive' ? 'Drive'
    : 'Workout';
  return `${period} ${activity}`;
}

export function formatSessionDate(startedAt: Timestamp): string {
  const date = startedAt.toDate();
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (startOfDate === startOfToday) return `Today, ${time}`;
  if (startOfDate === startOfYesterday) return `Yesterday, ${time}`;
  const label = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  return `${label}, ${time}`;
}
