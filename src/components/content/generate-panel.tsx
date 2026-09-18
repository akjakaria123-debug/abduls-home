'use client';

import { useFormState } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { generatePostsAction, type ContentActionResult } from '@/lib/actions/content';
import { GENERATION_DAY_OPTIONS } from '@/lib/validations/content';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';

const initialState: ContentActionResult | null = null;

export function GeneratePanel({
  pages,
  approvalMode,
}: {
  pages: { id: string; name: string }[];
  approvalMode: string;
}) {
  const [state, formAction] = useFormState(generatePostsAction, initialState);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[10rem] flex-1">
            <Label htmlFor="facebookPageId">Page</Label>
            <Select id="facebookPageId" name="facebookPageId" defaultValue={pages[0]?.id}>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-32">
            <Label htmlFor="days">Cover</Label>
            <Select id="days" name="days" defaultValue="7">
              {GENERATION_DAY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} days
                </option>
              ))}
            </Select>
          </div>

          <SubmitButton pendingText="Writing posts…">
            <Sparkles className="h-4 w-4" />
            Generate posts
          </SubmitButton>

          <p className="w-full text-xs text-slate-400">
            {approvalMode === 'auto_pilot'
              ? 'Auto-pilot is on — new posts are scheduled straight away.'
              : 'New posts arrive as drafts for you to review.'}
          </p>

          {state && 'error' in state && (
            <div className="w-full">
              <FormMessage error={state.error} />
            </div>
          )}
          {state && 'success' in state && (
            <div className="w-full">
              <FormMessage success={state.message} />
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
