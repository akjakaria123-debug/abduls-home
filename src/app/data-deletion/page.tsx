import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { LEGAL } from '@/lib/legal';
import { Bullets, LegalPage, Section } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: `Data Deletion — ${LEGAL.productName}`,
  description: 'How to delete your data, and check on a deletion request.',
};

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = searchParams.code?.trim();
  let request = null;

  if (code) {
    const supabase = createClient();
    const { data } = await supabase
      .from('data_deletion_requests')
      .select('confirmation_code, status, requested_at, completed_at')
      .eq('confirmation_code', code)
      .maybeSingle();
    request = data;
  }

  return (
    <LegalPage title="Data Deletion">
      {code && (
        <div
          className={
            request
              ? 'rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-4'
              : 'rounded-lg border border-white/10 bg-white/[0.04] px-4 py-4'
          }
        >
          {request ? (
            <>
              <p className="text-sm font-semibold text-emerald-200">
                Deletion request {request.status === 'completed' ? 'completed' : request.status}
              </p>
              <p className="mt-1 text-sm text-emerald-300">
                Reference <span className="font-mono">{request.confirmation_code}</span>. Requested{' '}
                {new Date(request.requested_at).toLocaleString('en-AU', { dateStyle: 'medium' })}
                {request.completed_at
                  ? `, completed ${new Date(request.completed_at).toLocaleString('en-AU', {
                      dateStyle: 'medium',
                    })}`
                  : ''}
                . Your Facebook connection, Page details and access tokens have been removed from
                our systems.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-300">
              We couldn&rsquo;t find a deletion request with the reference{' '}
              <span className="font-mono">{code}</span>. Check the code, or email us at{' '}
              <a href={`mailto:${LEGAL.contactEmail}`} className="text-indigo-300 hover:underline">
                {LEGAL.contactEmail}
              </a>
              .
            </p>
          )}
        </div>
      )}

      <p>
        You can remove your data from {LEGAL.productName} at any time. Here are the three ways to
        do it, depending on how much you want removed.
      </p>

      <Section heading="1. Disconnect Facebook only">
        <p>
          Removes our access to your Facebook Pages but keeps your account and your written posts.
        </p>
        <Bullets
          items={[
            'Log in and go to Facebook Pages.',
            'Click Disconnect.',
            'Your access tokens and stored Page details are deleted immediately, and we tell Facebook to revoke our access.',
          ]}
        />
      </Section>

      <Section heading="2. Remove the app from Facebook">
        <p>You can also do this from Facebook&rsquo;s side, without logging in here.</p>
        <Bullets
          items={[
            'In Facebook, go to Settings & Privacy → Settings.',
            'Open Apps and Websites.',
            `Find ${LEGAL.productName} and click Remove.`,
            'Facebook notifies us automatically and we delete everything we hold that came from Facebook, then give you a confirmation code to check on this page.',
          ]}
        />
      </Section>

      <Section heading="3. Delete your whole account">
        <p>Removes everything: your account, business details, and every post we generated.</p>
        <Bullets
          items={[
            `Email us at ${LEGAL.contactEmail} from the address on your account.`,
            'We will confirm it is you, then delete your data within 30 days.',
            'We keep payment records only where Australian tax law requires it.',
          ]}
        />
      </Section>

      <Section heading="What gets deleted">
        <p>When you delete Facebook data, we remove:</p>
        <Bullets
          items={[
            'Your Facebook access tokens.',
            'The list of Pages you connected, and their names and IDs.',
            'The Facebook post IDs of anything we published for you.',
            'Stored performance figures tied to those posts.',
          ]}
        />
        <p>
          Posts that already published stay live on your Facebook Page — those belong to your Page,
          and only you can remove them from Facebook itself.
        </p>
      </Section>

      <Section heading="Checking a request">
        <p>
          If you were given a confirmation code, add it to the end of this page&rsquo;s address as{' '}
          <span className="font-mono text-xs">?code=YOUR_CODE</span>, or email it to us and we will
          confirm.
        </p>
      </Section>

      <Section heading="Questions">
        <p>
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-indigo-300 hover:underline">
            {LEGAL.contactEmail}
          </a>
        </p>
      </Section>
    </LegalPage>
  );
}
