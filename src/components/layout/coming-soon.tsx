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
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-indigo-300">{phase}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
