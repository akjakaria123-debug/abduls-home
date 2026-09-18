// Languages the AI can write posts in.
//
// Codes are BCP-47. The native name is shown in the picker alongside the
// English one, because someone looking for Vietnamese scans for
// "Tiếng Việt" faster than they scan for "Vietnamese".
//
// The English variants are listed first: this is built for Australian
// small businesses, and most of them want en-AU. Everything after that is
// alphabetical by English name.

export interface Language {
  /** BCP-47 code, stored on the business record. */
  code: string;
  /** English name, used in the picker and sent to the AI. */
  label: string;
  /** Endonym — the language's name in itself. */
  nativeName: string;
  /** Right-to-left script. */
  rtl?: boolean;
}

export const ENGLISH_VARIANTS: Language[] = [
  { code: 'en-AU', label: 'English (Australia)', nativeName: 'English (Australia)' },
  { code: 'en-NZ', label: 'English (New Zealand)', nativeName: 'English (New Zealand)' },
  { code: 'en-GB', label: 'English (UK)', nativeName: 'English (UK)' },
  { code: 'en-US', label: 'English (US)', nativeName: 'English (US)' },
  { code: 'en-CA', label: 'English (Canada)', nativeName: 'English (Canada)' },
  { code: 'en-IE', label: 'English (Ireland)', nativeName: 'English (Ireland)' },
  { code: 'en-IN', label: 'English (India)', nativeName: 'English (India)' },
  { code: 'en-SG', label: 'English (Singapore)', nativeName: 'English (Singapore)' },
  { code: 'en-ZA', label: 'English (South Africa)', nativeName: 'English (South Africa)' },
];

export const OTHER_LANGUAGES: Language[] = [
  { code: 'ar', label: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'hy', label: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'bn', label: 'Bengali', nativeName: 'বাংলা' },
  { code: 'bs', label: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'bg', label: 'Bulgarian', nativeName: 'Български' },
  { code: 'my', label: 'Burmese', nativeName: 'မြန်မာ' },
  { code: 'yue', label: 'Cantonese', nativeName: '廣東話' },
  { code: 'zh-Hans', label: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-Hant', label: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'hr', label: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'cs', label: 'Czech', nativeName: 'Čeština' },
  { code: 'da', label: 'Danish', nativeName: 'Dansk' },
  { code: 'nl', label: 'Dutch', nativeName: 'Nederlands' },
  { code: 'fil', label: 'Filipino', nativeName: 'Filipino' },
  { code: 'fi', label: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', label: 'French', nativeName: 'Français' },
  { code: 'de', label: 'German', nativeName: 'Deutsch' },
  { code: 'el', label: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'he', label: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hu', label: 'Hungarian', nativeName: 'Magyar' },
  { code: 'id', label: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', label: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'km', label: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'ko', label: 'Korean', nativeName: '한국어' },
  { code: 'lo', label: 'Lao', nativeName: 'ລາວ' },
  { code: 'mk', label: 'Macedonian', nativeName: 'Македонски' },
  { code: 'ms', label: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ml', label: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mt', label: 'Maltese', nativeName: 'Malti' },
  { code: 'mr', label: 'Marathi', nativeName: 'मराठी' },
  { code: 'ne', label: 'Nepali', nativeName: 'नेपाली' },
  { code: 'nb', label: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fa', label: 'Persian', nativeName: 'فارسی', rtl: true },
  { code: 'pl', label: 'Polish', nativeName: 'Polski' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)' },
  { code: 'pa', label: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ro', label: 'Romanian', nativeName: 'Română' },
  { code: 'ru', label: 'Russian', nativeName: 'Русский' },
  { code: 'sr', label: 'Serbian', nativeName: 'Српски' },
  { code: 'si', label: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'sk', label: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', label: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'es-ES', label: 'Spanish (Spain)', nativeName: 'Español (España)' },
  { code: 'es-419', label: 'Spanish (Latin America)', nativeName: 'Español (Latinoamérica)' },
  { code: 'sw', label: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'sv', label: 'Swedish', nativeName: 'Svenska' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', label: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', label: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', label: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur', label: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'vi', label: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

export const ALL_LANGUAGES: Language[] = [...ENGLISH_VARIANTS, ...OTHER_LANGUAGES];

export const DEFAULT_LANGUAGE = 'en-AU';

const BY_CODE = new Map(ALL_LANGUAGES.map((language) => [language.code, language]));

export function getLanguage(code: string): Language | undefined {
  return BY_CODE.get(code);
}

export function isSupportedLanguage(code: string): boolean {
  return BY_CODE.has(code);
}

/**
 * How the language is described to the AI. Sending "Vietnamese
 * (Tiếng Việt)" produces better output than sending the code "vi".
 */
export function describeLanguage(code: string): string {
  const language = getLanguage(code);
  if (!language) return code;
  if (language.nativeName === language.label) return language.label;
  return `${language.label} (${language.nativeName})`;
}

export function isRtlLanguage(code: string): boolean {
  return getLanguage(code)?.rtl === true;
}
