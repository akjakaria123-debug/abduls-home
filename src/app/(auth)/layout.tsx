import Link from 'next/link';
import type { ReactNode } from 'react';
import { Aurora } from '@/components/marketing/aurora';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#070A1A] px-4 py-12">
      <Aurora />
      <Link href="/" className="relative mb-8 text-xl font-bold text-white">
        PostPilot
        <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
          .ai
        </span>
      </Link>
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
