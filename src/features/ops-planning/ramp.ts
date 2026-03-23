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
