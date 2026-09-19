import type { ReactNode } from 'react';
import Link from 'next/link';
import { LEGAL, isLegalConfigured } from '@/lib/legal';

/** Shared shell so all three policies look like one document set. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white">
      <header className="border-b border-slate-200">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-slate-900">
            {LEGAL.productName}
          </Link>
          <Link href="/" className="text-sm text-brand-600 hover:underline">
            Back to site
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {LEGAL.lastUpdated}</p>

        {!isLegalConfigured() && (
          <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Setup not finished.</strong> This page still contains placeholder business
            details. Edit <code className="font-mono text-xs">src/lib/legal.ts</code> with your
            company name, ABN and contact email before going live. This notice disappears once
            you do, and is only visible because the placeholders are still there.
          </p>
        )}

        <div className="legal-body mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          {children}
        </div>

        <footer className="mt-12 border-t border-slate-100 pt-6 text-sm text-slate-500">
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-slate-900 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 hover:underline">
              Terms of Service
            </Link>
            <Link href="/data-deletion" className="hover:text-slate-900 hover:underline">
              Data Deletion
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            {LEGAL.legalEntityName} · ABN {LEGAL.abn} · {LEGAL.address}
          </p>
        </footer>
      </main>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
      {children}
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
