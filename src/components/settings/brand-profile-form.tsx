'use client';

import { useFormState } from 'react-dom';
import { saveBrandProfileAction, type ContentActionResult } from '@/lib/actions/content';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';

const initialState: ContentActionResult | null = null;

export function BrandProfileForm({
  preferredCta,
  brandVoice,
  wordsToAvoid,
}: {
  preferredCta: string;
  brandVoice: string;
  wordsToAvoid: string[];
}) {
  const [state, formAction] = useFormState(saveBrandProfileAction, initialState);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white">Brand profile</h2>
        <p className="text-xs text-slate-400">Fine-tune how the AI sounds when it writes for you.</p>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="preferredCta">Preferred call to action</Label>
            <Input
              id="preferredCta"
              name="preferredCta"
              defaultValue={preferredCta}
              placeholder="e.g. Book online today"
            />
          </div>

          <div>
            <Label htmlFor="brandVoice">Brand voice</Label>
            <Textarea
              id="brandVoice"
              name="brandVoice"
              rows={3}
              defaultValue={brandVoice}
              placeholder="e.g. Warm and down to earth. We talk like a neighbour, not a corporation."
            />
          </div>

          <div>
            <Label htmlFor="wordsToAvoid">Words to avoid</Label>
            <Input
              id="wordsToAvoid"
              name="wordsToAvoid"
              defaultValue={wordsToAvoid.join(', ')}
              placeholder="cheap, discount, guaranteed"
            />
            <p className="mt-1 text-xs text-slate-400">Separate with commas.</p>
          </div>

          {state && 'error' in state && <FormMessage error={state.error} />}
          {state && 'success' in state && <FormMessage success={state.message} />}

          <SubmitButton pendingText="Saving…">Save brand profile</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
