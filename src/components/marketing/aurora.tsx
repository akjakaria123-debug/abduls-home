/**
 * The drifting colour field behind the dark sections.
 *
 * Two blurred radial gradients on slow, offset loops. It sits behind
 * everything and is marked aria-hidden: it carries no information, and
 * pointer-events-none keeps it from eating clicks meant for the content
 * above it.
 */
export function Aurora({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="aurora-a absolute -left-1/4 -top-1/3 h-[70rem] w-[70rem] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.30),transparent_65%)] blur-3xl" />
      <div className="aurora-b absolute -right-1/4 top-1/4 h-[60rem] w-[60rem] rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.22),transparent_65%)] blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#070A1A] to-transparent" />
    </div>
  );
}
