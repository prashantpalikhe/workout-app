export const PersonalRecordType = {
  ONE_REP_MAX: 'ONE_REP_MAX',
  MAX_REPS: 'MAX_REPS',
  MAX_WEIGHT: 'MAX_WEIGHT',
  MAX_VOLUME: 'MAX_VOLUME',
} as const;
export type PersonalRecordType = (typeof PersonalRecordType)[keyof typeof PersonalRecordType];
export const PERSONAL_RECORD_TYPES = Object.values(PersonalRecordType);
