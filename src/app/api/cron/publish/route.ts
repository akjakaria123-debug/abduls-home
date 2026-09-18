import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { publishDuePosts } from '@/lib/publishing/publisher';

// This endpoint publishes to real Facebook Pages, so it must never be
// cached and must never be reachable without the secret.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // No secret configured means no one gets in — failing closed is the
  // only safe default for an endpoint that posts publicly.
  if (!secret) return false;

  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);

  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const summary = await publishDuePosts();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish run failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
