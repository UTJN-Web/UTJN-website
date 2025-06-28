// lib/eventMeta.ts
export const NAME_MAP = {
  Halloween:        'Halloween Party',
  New_Year_Event:   'New Year Event',
  End_of_Year:      'End of Year Party',
  Ball_Game:        '球技大会',
  Sports_Fes:       '運動会',
} as const;

export type EventSlug = keyof typeof NAME_MAP;
