export interface CalendarPost {
  id: string;
  category: string;
  caption: string;
  cta: string | null;
  hashtags: string[];
  imageIdea: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
  status: string;
  scheduledAt: string | null;
  facebookPostId: string | null;
  errorMessage: string | null;
  pageName: string | null;
}

export const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-white/10 text-slate-300',
  approved: 'bg-amber-500/15 text-amber-200',
  scheduled: 'bg-indigo-500/20 text-indigo-200',
  published: 'bg-emerald-500/15 text-emerald-200',
  failed: 'bg-red-500/15 text-red-200',
};

export const STATUS_DOTS: Record<string, string> = {
  draft: 'bg-slate-400',
  approved: 'bg-amber-400',
  scheduled: 'bg-indigo-400',
  published: 'bg-emerald-400',
  failed: 'bg-red-400',
};

export function formatTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  });
}
