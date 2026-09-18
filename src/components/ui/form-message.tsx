export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;

  return (
    <p className={error ? 'text-sm text-red-600' : 'text-sm text-emerald-600'} role={error ? 'alert' : 'status'}>
      {error ?? success}
    </p>
  );
}
