import { Card, CardContent } from '@/components/ui/card';

export function ComingSoon({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-brand-600">{phase}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
