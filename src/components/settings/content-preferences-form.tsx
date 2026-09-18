'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { saveContentPreferencesAction, type ContentActionResult } from '@/lib/actions/content';
import { ALL_CONTENT_CATEGORIES } from '@/lib/ai/category-mix';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';

const initialState: ContentActionResult | null = null;

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

function formatCategory(category: string) {
  return category.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function ContentPreferencesForm({
  enabledCategories,
  postsPerDay,
  postingDays,
  postingTimes,
  approvalMode,
  maxPostsPerDay,
}: {
  enabledCategories: string[];
  postsPerDay: number;
  postingDays: number[];
  postingTimes: string[];
  approvalMode: string;
  maxPostsPerDay: number;
}) {
  const [state, formAction] = useFormState(saveContentPreferencesAction, initialState);
  const [times, setTimes] = useState<string[]>(
    postingTimes.length ? postingTimes.map((time) => time.slice(0, 5)) : ['09:00']
  );

  const perDayOptions = Array.from({ length: Math.max(maxPostsPerDay, 1) }, (_, i) => i + 1);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Content settings</h2>
        <p className="text-xs text-slate-500">What we write, how often, and when it goes out.</p>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Content types</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_CONTENT_CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name="enabledCategories"
                    value={category}
                    defaultChecked={enabledCategories.includes(category)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {formatCategory(category)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="postsPerDay">Posts per day</Label>
              <Select id="postsPerDay" name="postsPerDay" defaultValue={String(postsPerDay)}>
                {perDayOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-400">Your plan allows up to {maxPostsPerDay}.</p>
            </div>

            <div>
              <Label htmlFor="approvalMode">Approval</Label>
              <Select id="approvalMode" name="approvalMode" defaultValue={approvalMode}>
                <option value="manual">Approve before publishing</option>
                <option value="auto_pilot">Full auto-pilot</option>
              </Select>
              <p className="mt-1 text-xs text-slate-400">You can switch this any time.</p>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Posting days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    name="postingDays"
                    value={day.value}
                    defaultChecked={postingDays.includes(day.value)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Posting times</legend>
            <div className="space-y-2">
              {times.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    name="postingTimes"
                    value={time}
                    onChange={(event) => {
                      const next = [...times];
                      next[index] = event.target.value;
                      setTimes(next);
                    }}
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTimes(times.filter((_, i) => i !== index))}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      aria-label="Remove time"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {times.length < 5 && (
              <button
                type="button"
                onClick={() => setTimes([...times, '12:00'])}
                className="mt-2 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add time
              </button>
            )}

            <p className="mt-2 text-xs text-slate-400">
              Times are in your business timezone. Add at least as many times as posts per day.
            </p>
          </fieldset>

          {state && 'error' in state && <FormMessage error={state.error} />}
          {state && 'success' in state && <FormMessage success={state.message} />}

          <SubmitButton pendingText="Saving…">Save content settings</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
