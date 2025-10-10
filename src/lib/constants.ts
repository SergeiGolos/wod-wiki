export const TIMER_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted))",
  destructive: "hsl(var(--destructive))",
} as const;

export const WORKOUT_TYPES = {
  AMRAP: "AMRAP",
  FOR_TIME: "For Time",
  EMOM: "EMOM",
  TABATA: "Tabata",
} as const;

export const HEART_RATE_ZONES = {
  ZONE_1: { min: 0, max: 120, color: "bg-blue-500", label: "Active Recovery" },
  ZONE_2: { min: 120, max: 140, color: "bg-green-500", label: "Aerobic Base" },
  ZONE_3: { min: 140, max: 160, color: "bg-yellow-500", label: "Aerobic Threshold" },
  ZONE_4: { min: 160, max: 175, color: "bg-orange-500", label: "Lactate Threshold" },
  ZONE_5: { min: 175, max: 999, color: "bg-red-500", label: "Neuromuscular Power" },
} as const;

export const WORKOUT_TYPE_COLORS = {
  AMRAP: "bg-blue-100 text-blue-800 border-blue-200",
  FOR_TIME: "bg-green-100 text-green-800 border-green-200",
  EMOM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  TABATA: "bg-red-100 text-red-800 border-red-200",
} as const;