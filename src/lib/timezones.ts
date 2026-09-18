// Timezones offered in the pickers. Australian zones first, since that's
// the primary market, then the rest grouped by region.
//
// These are IANA identifiers — the same strings the scheduling code feeds
// to Intl.DateTimeFormat, so anything valid here works end to end.

export const AUSTRALIAN_TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Hobart',
  'Australia/Darwin',
  'Australia/Canberra',
];

export const OTHER_TIMEZONES = [
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Bangkok',
  'Asia/Ho_Chi_Minh',
  'Asia/Phnom_Penh',
  'Asia/Yangon',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Kolkata',
  'Asia/Colombo',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Tehran',
  'Asia/Jerusalem',
  'Asia/Istanbul',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Berlin',
  'Europe/Zurich',
  'Europe/Rome',
  'Europe/Malta',
  'Europe/Vienna',
  'Europe/Prague',
  'Europe/Warsaw',
  'Europe/Budapest',
  'Europe/Zagreb',
  'Europe/Belgrade',
  'Europe/Sarajevo',
  'Europe/Skopje',
  'Europe/Sofia',
  'Europe/Bucharest',
  'Europe/Athens',
  'Europe/Helsinki',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Kyiv',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'UTC',
];

export const TIMEZONES = [...AUSTRALIAN_TIMEZONES, ...OTHER_TIMEZONES];

export const DEFAULT_TIMEZONE = 'Australia/Sydney';

export function isSupportedTimezone(value: string): boolean {
  return TIMEZONES.includes(value);
}
