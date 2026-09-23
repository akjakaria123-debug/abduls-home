export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;

  return (
    <p
      className={error ? 'text-sm text-red-300' : 'text-sm text-emerald-300'}
      role={error ? 'alert' : 'status'}
    >
      {error ?? success}
    </p>
  );
}
