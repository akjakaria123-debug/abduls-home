import { requireAdmin } from '@/lib/auth/admin';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function formatWhen(value: string) {
  return new Date(value).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' });
}

export default async function AdminLogsPage() {
  const { admin } = await requireAdmin();

  const [{ data: apiLogs }, { data: adminLogs }] = await Promise.all([
    admin
      .from('api_logs')
      .select('id, service, endpoint, status_code, success, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('admin_logs')
      .select('id, action, target_type, target_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Logs</h1>
        <p className="text-sm text-slate-500">Recent external API calls and admin actions.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">API calls</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Endpoint</th>
                <th className="px-5 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {(apiLogs ?? []).map((log) => (
                <tr key={log.id} className="border-b border-slate-50 last:border-0 align-top">
                  <td className="whitespace-nowrap px-5 py-2 text-xs text-slate-500">
                    {formatWhen(log.created_at)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{log.service}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{log.endpoint}</td>
                  <td className="px-5 py-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      )}
                    >
                      {log.success ? 'ok' : log.status_code ?? 'error'}
                    </span>
                    {log.error_message && (
                      <p className="mt-1 max-w-md text-xs text-red-600">{log.error_message}</p>
                    )}
                  </td>
                </tr>
              ))}
              {!apiLogs?.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                    No API calls recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Admin actions</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-5 py-2 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {(adminLogs ?? []).map((log) => (
                <tr key={log.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-5 py-2 text-xs text-slate-500">
                    {formatWhen(log.created_at)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{log.action.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-2 font-mono text-xs text-slate-500">
                    {log.target_type}/{log.target_id?.slice(0, 8)}
                  </td>
                </tr>
              ))}
              {!adminLogs?.length && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-400">
                    No admin actions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
