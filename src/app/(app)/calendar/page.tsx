import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  CALENDAR_VIEWS,
  getCalendarRange,
  isValidDateKey,
  toDateKey,
  todayKey,
  type CalendarView,
} from '@/lib/scheduling/calendar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { MonthView } from '@/components/calendar/month-view';
import { WeekView } from '@/components/calendar/week-view';
import { DayView } from '@/components/calendar/day-view';
import { PostEditor } from '@/components/calendar/post-editor';
import type { CalendarPost } from '@/components/calendar/types';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; date?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select('id, timezone')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!business) redirect('/onboarding');

  const timezone = business.timezone;
  const today = todayKey(timezone);

  // Never trust the URL: fall back to a sane view and today's date.
  const view: CalendarView = CALENDAR_VIEWS.includes(searchParams.view as CalendarView)
    ? (searchParams.view as CalendarView)
    : 'month';
  const anchor =
    searchParams.date && isValidDateKey(searchParams.date) ? searchParams.date : today;

  const range = getCalendarRange(view, anchor, timezone);

  const [{ data: pages }, { data: scheduled }, { data: unscheduled }] = await Promise.all([
    supabase
      .from('facebook_pages')
      .select('id, page_name')
      .eq('business_id', business.id),
    supabase
      .from('posts')
      .select(
        'id, category, caption, cta, hashtags, image_idea, status, scheduled_at, facebook_page_id, facebook_post_id, error_message'
      )
      .eq('business_id', business.id)
      .gte('scheduled_at', range.start.toISOString())
      .lt('scheduled_at', range.end.toISOString())
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('posts')
      .select(
        'id, category, caption, cta, hashtags, image_idea, status, scheduled_at, facebook_page_id, facebook_post_id, error_message'
      )
      .eq('business_id', business.id)
      .is('scheduled_at', null)
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  const pageNames = new Map((pages ?? []).map((page) => [page.id, page.page_name]));
  const showPageName = (pages?.length ?? 0) > 1;

  const toCalendarPost = (row: NonNullable<typeof scheduled>[number]): CalendarPost => ({
    id: row.id,
    category: row.category,
    caption: row.caption,
    cta: row.cta,
    hashtags: row.hashtags,
    imageIdea: row.image_idea,
    status: row.status,
    scheduledAt: row.scheduled_at,
    facebookPostId: row.facebook_post_id,
    errorMessage: row.error_message,
    pageName:
      showPageName && row.facebook_page_id ? pageNames.get(row.facebook_page_id) ?? null : null,
  });

  // Group by the business's local calendar day, not the UTC one.
  const postsByDay = new Map<string, CalendarPost[]>();
  for (const row of scheduled ?? []) {
    if (!row.scheduled_at) continue;
    const key = toDateKey(new Date(row.scheduled_at), timezone);
    const bucket = postsByDay.get(key);
    if (bucket) bucket.push(toCalendarPost(row));
    else postsByDay.set(key, [toCalendarPost(row)]);
  }

  const unscheduledPosts = (unscheduled ?? []).map(toCalendarPost);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Calendar</h1>
        <p className="text-sm text-slate-500">
          Everything queued up, in {timezone}. Open a day to edit or approve its posts.
        </p>
      </div>

      <CalendarToolbar
        view={view}
        anchor={anchor}
        label={range.label}
        previousAnchor={range.previousAnchor}
        nextAnchor={range.nextAnchor}
        todayAnchor={today}
      />

      {view === 'month' && (
        <MonthView
          days={range.days}
          postsByDay={postsByDay}
          timezone={timezone}
          todayAnchor={today}
        />
      )}

      {view === 'week' && (
        <WeekView
          days={range.days}
          postsByDay={postsByDay}
          timezone={timezone}
          todayAnchor={today}
        />
      )}

      {view === 'day' && (
        <DayView posts={postsByDay.get(anchor) ?? []} timezone={timezone} />
      )}

      {unscheduledPosts.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Unscheduled</h2>
            <p className="text-xs text-slate-500">
              These have no time yet — pick one with the reschedule button.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {unscheduledPosts.map((post) => (
              <PostEditor key={post.id} post={post} timezone={timezone} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
