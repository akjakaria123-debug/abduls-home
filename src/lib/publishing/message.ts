// A post is stored as three fields but published as one block of text.

export interface ComposablePost {
  caption: string;
  cta: string | null;
  hashtags: string[];
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function composePostMessage(post: ComposablePost): string {
  const blocks: string[] = [];

  const caption = post.caption.trim();
  if (caption) blocks.push(caption);

  // The model often ends the caption with the call to action already;
  // appending it again reads like a stutter.
  const cta = post.cta?.trim();
  if (cta && !normalise(caption).includes(normalise(cta))) {
    blocks.push(cta);
  }

  const hashtags = post.hashtags
    .map((tag) => tag.replace(/^#+/, '').trim())
    .filter(Boolean)
    .map((tag) => `#${tag}`);

  if (hashtags.length) blocks.push(hashtags.join(' '));

  return blocks.join('\n\n');
}
