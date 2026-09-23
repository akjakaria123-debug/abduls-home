import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'PostPilot.ai — Automatic Facebook Posting for Small Business',
  description: 'AI creates, schedules, and publishes your Facebook posts every day.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* No <head> element here: rendering one in a root layout stops
          Next injecting its own stylesheet links, which silently ships
          the whole site unstyled. */}
      <body className={jakarta.className}>{children}</body>
    </html>
  );
}
