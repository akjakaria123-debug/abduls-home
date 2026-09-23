import type { ReactNode } from 'react';

/**
 * Fades its children up on load, staggered by `delay`.
 *
 * Deliberately a plain CSS animation rather than a scroll observer.
 * A scroll-triggered version has to start the content at opacity 0,
 * which makes JavaScript the only thing standing between a visitor and
 * the entire page — and neither an inline script nor a <noscript>
 * override survives React's server rendering here to undo it. This runs
 * with animation-fill-mode: both, so the end state is visible whatever
 * happens: scripts off, animations unsupported, reduced motion.
 *
 * The trade is that sections below the fold have finished animating by
 * the time they are scrolled to. That costs a flourish nobody sees, and
 * buys a page that cannot come up blank.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`rise ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
