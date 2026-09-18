import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GeneratePanel } from '@/components/content/generate-panel';
import { PostCard } from '@/components/content/post-card';

export default async function ContentPage() {
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

  const [{ data: pages }, { data: preferences }, { data: posts }] = await Promise.all([
    supabase
      .from('facebook_pages')
      .select('id, page_name')
      .eq('business_id', business.id)
      .eq('is_selected', true)
      .order('page_name', { ascending: true }),
    supabase
      .from('content_preferences')
      .select('approval_mode, enabled_categories')
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('posts')
      .select('id, category, caption, cta, hashtags, image_idea, status, scheduled_at')
      .eq('business_id', business.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(60),
  ]);

  const activePages = pages ?? [];
  const hasCategories = (preferences?.enabled_categories?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Content</h1>
        <p className="text-sm text-slate-500">
          Generate a run of posts, then review them before they go out.
        </p>
      </div>

      {activePages.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-sm text-slate-600">
              Activate a Facebook Page before generating content.
            </p>
            <Link href="/facebook-pages">
              <Button>Go to Facebook Pages</Button>
            </Link>
          </CardContent>
        </Card>
      ) : !hasCategories ? (
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-sm text-slate-600">
              Choose which types of content you want before generating.
            </p>
            <Link href="/settings">
              <Button>Choose content types</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <GeneratePanel
          pages={activePages.map((page) => ({ id: page.id, name: page.page_name }))}
          approvalMode={preferences?.approval_mode ?? 'manual'}
        />
      )}

      {posts?.length ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                category: post.category,
                caption: post.caption,
                cta: post.cta,
                hashtags: post.hashtags,
                imageIdea: post.image_idea,
                status: post.status,
                scheduledAt: post.scheduled_at,
                timezone: business.timezone,
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No posts yet. Generate your first run above.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
