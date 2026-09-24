import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// api_logs has no client-facing RLS policy — it's written with the
// service-role client and read only by the admin dashboard.
export async function logApiCall(params: {
  businessId?: string | null;
  service: 'meta' | 'stripe' | 'openai' | 'images';
  endpoint: string;
  success: boolean;
  statusCode?: number | null;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await createAdminClient().from('api_logs').insert({
      business_id: params.businessId ?? null,
      service: params.service,
      endpoint: params.endpoint,
      status_code: params.statusCode ?? null,
      success: params.success,
      error_message: params.errorMessage ?? null,
    });
  } catch {
    // Observability must never break the request it's observing.
  }
}
