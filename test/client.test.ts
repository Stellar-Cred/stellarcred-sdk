import { describe, expect, it } from "vitest";

import { ScoreTier } from "../src/types";
import {
  calculateProgressToNextTier,
  credentialIcon,
  formatScore,
  getScoreColor,
  getScoreTier,
  timeAgo,
  truncateAddress,
} from "../src/utils";

describe("getScoreTier", () => {
  it("classifies every tier boundary correctly", () => {
    expect(getScoreTier(0)).toBe(ScoreTier.Newcomer);
    expect(getScoreTier(99)).toBe(ScoreTier.Newcomer);
    expect(getScoreTier(100)).toBe(ScoreTier.Bronze);
    expect(getScoreTier(299)).toBe(ScoreTier.Bronze);
    expect(getScoreTier(300)).toBe(ScoreTier.Silver);
    expect(getScoreTier(499)).toBe(ScoreTier.Silver);
    expect(getScoreTier(500)).toBe(ScoreTier.Gold);
    expect(getScoreTier(699)).toBe(ScoreTier.Gold);
    expect(getScoreTier(700)).toBe(ScoreTier.Platinum);
    expect(getScoreTier(899)).toBe(ScoreTier.Platinum);
    expect(getScoreTier(900)).toBe(ScoreTier.Diamond);
    expect(getScoreTier(1000)).toBe(ScoreTier.Diamond);
  });
});

describe("getScoreColor", () => {
  it("returns a hex color for a score in every tier", () => {
    for (const score of [0, 150, 350, 550, 750, 950]) {
      expect(getScoreColor(score)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("formatScore", () => {
  it('formats as "score / 1000"', () => {
    expect(formatScore(750)).toBe("750 / 1000");
    expect(formatScore(0)).toBe("0 / 1000");
    expect(formatScore(1000)).toBe("1000 / 1000");
  });
});

describe("credentialIcon", () => {
  it("returns a specific icon for each built-in credential type", () => {
    expect(credentialIcon("Verified")).toBe("✅");
    expect(credentialIcon("PaymentRecord")).toBe("💳");
    expect(credentialIcon("StreamCompleted")).toBe("🌊");
  });

  it("falls back to a default badge icon for unknown types", () => {
    expect(credentialIcon("SomeCustomType")).toBe("🏅");
  });
});

describe("truncateAddress", () => {
  it("truncates long addresses to first 4 + ... + last 4 characters", () => {
    const address = "GABC" + "X".repeat(48) + "WXYZ";
    expect(truncateAddress(address)).toBe("GABC...WXYZ");
  });

  it("leaves short strings untouched", () => {
    expect(truncateAddress("short")).toBe("short");
  });
});

describe("timeAgo", () => {
  it('reports the current moment as "just now"', () => {
    expect(timeAgo(new Date())).toBe("just now");
  });

  it("reports hours ago correctly", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(timeAgo(twoHoursAgo)).toBe("2 hours ago");
  });

  it("reports days ago correctly", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(timeAgo(threeDaysAgo)).toBe("3 days ago");
  });
});

describe("calculateProgressToNextTier", () => {
  it("computes progress halfway through the Bronze range", () => {
    const result = calculateProgressToNextTier(200);
    expect(result.current).toBe(ScoreTier.Bronze);
    expect(result.next).toBe(ScoreTier.Silver);
    expect(result.progress).toBeCloseTo(0.5, 5);
  });

  it("computes zero progress at the start of a tier", () => {
    const result = calculateProgressToNextTier(500);
    expect(result.current).toBe(ScoreTier.Gold);
    expect(result.next).toBe(ScoreTier.Platinum);
    expect(result.progress).toBeCloseTo(0, 5);
  });

  it("returns no next tier and full progress at the maximum score", () => {
    const result = calculateProgressToNextTier(1000);
    expect(result.current).toBe(ScoreTier.Diamond);
    expect(result.next).toBeNull();
    expect(result.progress).toBe(1);
  });
});
