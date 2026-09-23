import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardContent className="space-y-3 text-center">
        <h1 className="text-lg font-semibold text-white">Check your email</h1>
        <p className="text-sm text-slate-400">
          We sent a confirmation link to your email address. Click it to activate your account,
          then log in.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-indigo-300 hover:underline">
          Back to login
        </Link>
      </CardContent>
    </Card>
  );
}
