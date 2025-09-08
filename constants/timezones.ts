export const QUICK_TZS: string[] = [
  'America/Phoenix',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/New_York',
];

export const ALL_TZS: string[] = Array.from(new Set([
  ...QUICK_TZS,
  'UTC',
  'America/Anchorage',
  'America/Juneau',
  'America/Boise',
  'America/Detroit',
  'America/Indiana/Indianapolis',
  'America/Indiana/Knox',
  'America/Indiana/Marengo',
  'America/Indiana/Petersburg',
  'America/Indiana/Tell_City',
  'America/Indiana/Vevay',
  'America/Indiana/Vincennes',
  'America/Indiana/Winamac',
  'America/Kentucky/Louisville',
  'America/Kentucky/Monticello',
  'America/Toronto',
  'America/Mexico_City',
  'America/Tijuana',
  'America/Monterrey',
  'America/Guatemala',
  'America/Costa_Rica',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Prague',
  'Europe/Warsaw',
  'Europe/Athens',
  'Europe/Helsinki',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
]));

export function isValidIana(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
