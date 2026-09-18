export interface CalendarPost {
  id: string;
  category: string;
  caption: string;
  cta: string | null;
  hashtags: string[];
  imageIdea: string | null;
  status: string;
  scheduledAt: string | null;
  facebookPostId: string | null;
  errorMessage: string | null;
  pageName: string | null;
}

export const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  approved: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-brand-100 text-brand-700',
  published: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

export const STATUS_DOTS: Record<string, string> = {
  draft: 'bg-slate-400',
  approved: 'bg-amber-500',
  scheduled: 'bg-brand-500',
  published: 'bg-emerald-500',
  failed: 'bg-red-500',
};

export function formatTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  });
}
