import { Card, CardContent } from '@/components/ui/card';
import { PostEditor } from '@/components/calendar/post-editor';
import type { CalendarPost } from '@/components/calendar/types';

export function DayView({ posts, timezone }: { posts: CalendarPost[]; timezone: string }) {
  if (!posts.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Nothing scheduled for this day.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostEditor key={post.id} post={post} timezone={timezone} />
      ))}
    </div>
  );
}
