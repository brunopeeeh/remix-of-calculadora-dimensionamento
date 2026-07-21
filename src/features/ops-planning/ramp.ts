/**
 * Returns the productivity factor for a hire that has been active for `monthsSinceHire` months
 * with a total ramp-up period of `rampUpMonths`.
 *
 * Example with rampUpMonths=3: month 0 → 1/3, month 1 → 2/3, month 2+ → 1
 */
export const getRampFactor = (monthsSinceHire: number, rampUpMonths: number): number => {
  if (monthsSinceHire < 0) return 0;
  if (rampUpMonths <= 1) return 1;
  if (monthsSinceHire >= rampUpMonths - 1) return 1;
  return (monthsSinceHire + 1) / rampUpMonths;
};

/**
 * How many months before full productivity a hire needs to start
 * to be fully ramped at the target month.
 */
export const getRampMaturationOffset = (rampUpMonths: number): number => {
  if (rampUpMonths <= 1) return 0;
  return rampUpMonths - 1;
};

// ── Rookie (headcountNovo) helpers ──

import { RookieRampFactors, RookieRampMonth } from "./types";

/** Get the productivity factor for a specific ramp-up month using configurable factors */
export const getRookieRampFactor = (month: RookieRampMonth, factors: RookieRampFactors): number => {
  const map: Record<RookieRampMonth, number> = {
    1: factors.month1,
    2: factors.month2,
    3: factors.month3,
  };
  return map[month] ?? 1;
};

/**
 * Compute the effective FTE of new agents at a given simulation month index.
 * New agents progress through ramp-up automatically:
 *   - simulationMonth 0 → month1 factor (e.g. 33%)
 *   - simulationMonth 1 → month2 factor (e.g. 66%)
 *   - simulationMonth 2+ → month3 factor (e.g. 100%)
 */
export const computeRookieEffectiveForMonth = (
  headcountNovo: number,
  simulationMonth: number,
  factors: RookieRampFactors,
): number => {
  if (headcountNovo <= 0) return 0;
  const rampMonth: RookieRampMonth = simulationMonth <= 0 ? 1 : simulationMonth === 1 ? 2 : 3;
  return headcountNovo * getRookieRampFactor(rampMonth, factors);
};
