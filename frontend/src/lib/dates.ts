import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const TIME_SLOTS = ['18:00', '19:00', '20:00', '21:00', '22:00'];

export function getDaysInRange(startDate: string, endDate: string): Date[] {
  return eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEE d MMM', { locale: es });
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
