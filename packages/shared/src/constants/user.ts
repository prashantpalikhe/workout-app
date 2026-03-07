export const UserRole = {
  ATHLETE: 'ATHLETE',
  TRAINER: 'TRAINER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const USER_ROLES = Object.values(UserRole);

export const UnitPreference = {
  METRIC: 'METRIC',
  IMPERIAL: 'IMPERIAL',
} as const;
export type UnitPreference = (typeof UnitPreference)[keyof typeof UnitPreference];
export const UNIT_PREFERENCES = Object.values(UnitPreference);

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];
export const GENDERS = Object.values(Gender);

export const Theme = {
  LIGHT: 'LIGHT',
  DARK: 'DARK',
  SYSTEM: 'SYSTEM',
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];
export const THEMES = Object.values(Theme);
