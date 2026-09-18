import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { refreshDueInsights } from '@/lib/analytics/insights';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
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
    const summary = await refreshDueInsights();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Insights refresh failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
