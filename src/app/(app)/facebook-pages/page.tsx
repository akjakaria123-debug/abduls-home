import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPageLimit } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageRow } from '@/components/facebook/page-row';
import { DisconnectButton } from '@/components/facebook/disconnect-button';
import { VerifyConnectionButton } from '@/components/facebook/verify-button';

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'Facebook connection was cancelled.',
  invalid_state: 'That connection attempt expired or looked unsafe. Please try again.',
  save_failed: 'Could not save your Facebook connection. Please try again.',
  no_pages_found:
    "We couldn't find any Facebook Pages on that account. You need to be an admin of at least one Page.",
};

export default async function FacebookPagesPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!business) redirect('/onboarding');

  const { data: connection } = await supabase
    .from('facebook_connections')
    .select('id, connected_at')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: pages } = await supabase
    .from('facebook_pages')
    .select('id, page_name, is_selected, token_status, last_token_check_at')
    .eq('business_id', business.id)
    .order('page_name', { ascending: true });

  const limit = await getPageLimit(supabase, business.id);
  const selectedCount = pages?.filter((page) => page.is_selected).length ?? 0;
  const atLimit = selectedCount >= limit;

  const errorMessage = searchParams.error
    ? ERROR_MESSAGES[searchParams.error] ?? decodeURIComponent(searchParams.error)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Facebook Pages</h1>
        <p className="text-sm text-slate-500">
          Connect your Facebook account and choose which Pages we can post to.
        </p>
      </div>

      {searchParams.connected && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Facebook connected. Choose which Page{limit === 1 ? '' : 's'} to activate below.
        </p>
      )}

      {errorMessage && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {!connection ? (
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <div>
              <p className="text-sm font-medium text-slate-900">No Facebook account connected</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                We connect through the official Meta Graph API. You log in with Facebook directly —
                we never see or store your password.
              </p>
            </div>

            <ul className="mx-auto max-w-sm space-y-1 text-left text-xs text-slate-500">
              <li>· See the list of Pages you manage</li>
              <li>· Publish posts to the Pages you activate</li>
              <li>· Read engagement on those posts, for your analytics</li>
            </ul>

            <Link href="/api/facebook/connect">
              <Button size="lg">Connect Facebook</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Your Pages</h2>
              <p className="text-xs text-slate-500">
                {selectedCount} of {limit} active · connected{' '}
                {new Date(connection.connected_at).toLocaleDateString('en-AU')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <VerifyConnectionButton />
              <Link href="/api/facebook/connect">
                <Button type="button" variant="outline" size="sm">
                  Reconnect
                </Button>
              </Link>
              <DisconnectButton />
            </div>
          </CardHeader>

          <CardContent>
            {pages?.length ? (
              <>
                {pages.map((page) => (
                  <PageRow
                    key={page.id}
                    id={page.id}
                    name={page.page_name}
                    isSelected={page.is_selected}
                    tokenStatus={page.token_status}
                    atLimit={atLimit}
                  />
                ))}
                {atLimit && (
                  <p className="pt-3 text-xs text-slate-500">
                    You&apos;ve reached your plan&apos;s limit of {limit} active Page
                    {limit === 1 ? '' : 's'}. Deactivate one, or upgrade in{' '}
                    <Link href="/billing" className="text-brand-600 hover:underline">
                      Billing
                    </Link>
                    .
                  </p>
                )}
              </>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No Pages found on this connection.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
