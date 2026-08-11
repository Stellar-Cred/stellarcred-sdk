import { ScoreTier } from "./types";

const TIER_ORDER: ScoreTier[] = [
  ScoreTier.Newcomer,
  ScoreTier.Bronze,
  ScoreTier.Silver,
  ScoreTier.Gold,
  ScoreTier.Platinum,
  ScoreTier.Diamond,
];

const TIER_MIN: Record<ScoreTier, number> = {
  [ScoreTier.Newcomer]: 0,
  [ScoreTier.Bronze]: 100,
  [ScoreTier.Silver]: 300,
  [ScoreTier.Gold]: 500,
  [ScoreTier.Platinum]: 700,
  [ScoreTier.Diamond]: 900,
};

const TIER_COLOR: Record<ScoreTier, string> = {
  [ScoreTier.Newcomer]: "#64748B",
  [ScoreTier.Bronze]: "#B45309",
  [ScoreTier.Silver]: "#94A3B8",
  [ScoreTier.Gold]: "#F59E0B",
  [ScoreTier.Platinum]: "#7C3AED",
  [ScoreTier.Diamond]: "#60A5FA",
};

const CREDENTIAL_ICONS: Record<string, string> = {
  PaymentRecord: "💳",
  StreamCompleted: "🌊",
  InvoiceCreator: "🧾",
  WillOwner: "📜",
  DeveloperContrib: "🛠️",
  LongTermHolder: "⏳",
  Verified: "✅",
};

const DEFAULT_CREDENTIAL_ICON = "🏅";

/**
 * Classifies a 0-1000 StellarCred score into its reputation tier.
 */
export function getScoreTier(score: number): ScoreTier {
  let tier = ScoreTier.Newcomer;
  for (const candidate of TIER_ORDER) {
    if (score >= TIER_MIN[candidate]) {
      tier = candidate;
    }
  }
  return tier;
}

/**
 * Returns the brand hex color associated with a score's tier.
 */
export function getScoreColor(score: number): string {
  return TIER_COLOR[getScoreTier(score)];
}

/**
 * Formats a score as "N / 1000".
 */
export function formatScore(score: number): string {
  return `${score} / 1000`;
}

/**
 * Returns a representative emoji for a credential type, falling back to a
 * generic badge icon for unrecognized types.
 */
export function credentialIcon(credentialType: string): string {
  return CREDENTIAL_ICONS[credentialType] ?? DEFAULT_CREDENTIAL_ICON;
}

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/**
 * Formats a past Date as a human-readable relative time, e.g. "2 days ago".
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, secondsInUnit] of RELATIVE_TIME_UNITS) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) {
      return formatter.format(-value, unit);
    }
  }
  return "just now";
}

/**
 * Truncates a Stellar address to "GABC...WXYZ" form. Strings of 10
 * characters or fewer are returned unchanged.
 */
export function truncateAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export interface TierProgress {
  current: ScoreTier;
  next: ScoreTier | null;
  progress: number;
}

/**
 * Computes how far a score has progressed through its current tier's
 * range toward the next tier. Returns `next: null` and `progress: 1` at
 * the top tier (Diamond).
 */
export function calculateProgressToNextTier(score: number): TierProgress {
  const current = getScoreTier(score);
  const index = TIER_ORDER.indexOf(current);
  const next = index < TIER_ORDER.length - 1 ? TIER_ORDER[index + 1] : null;

  if (!next) {
    return { current, next: null, progress: 1 };
  }

  const rangeStart = TIER_MIN[current];
  const rangeEnd = TIER_MIN[next];
  const progress = (score - rangeStart) / (rangeEnd - rangeStart);
  return { current, next, progress: Math.min(Math.max(progress, 0), 1) };
}
