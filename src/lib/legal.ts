// ─────────────────────────────────────────────────────────────────────
// EDIT THIS FILE with your real business details before going live.
// Everything on the privacy, terms and data deletion pages reads from
// here, so you only have to change it in one place.
// ─────────────────────────────────────────────────────────────────────

export const LEGAL = {
  /** Trading name shown to customers. */
  productName: 'PostPilot.ai',

  /** Registered company or sole-trader name. */
  legalEntityName: 'REPLACE ME PTY LTD',

  /** Australian Business Number. */
  abn: 'REPLACE ME',

  /** Where customers email you about privacy and their data. */
  contactEmail: 'support@example.com.au',

  /** Business address. A suburb and state is enough. */
  address: 'Sydney, NSW, Australia',

  /** Your live site, no trailing slash. */
  websiteUrl: 'https://example.com.au',

  /** Shown at the top of each policy. Update when you change the text. */
  lastUpdated: '19 September 2026',

  /** State or territory whose law governs your terms. */
  governingState: 'New South Wales',
} as const;

export function isLegalConfigured(): boolean {
  return (
    !LEGAL.legalEntityName.includes('REPLACE ME') &&
    !LEGAL.abn.includes('REPLACE ME') &&
    !LEGAL.contactEmail.includes('example.com')
  );
}
