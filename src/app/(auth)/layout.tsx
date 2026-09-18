import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-8 text-xl font-bold text-slate-900">
        PostPilot<span className="text-brand-600">.ai</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
