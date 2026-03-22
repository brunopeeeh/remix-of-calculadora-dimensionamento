export type NumberFieldFormat = "integer" | "decimal";

const TRANSIENT_TOKENS = new Set(["", "-", ".", ",", "-.", "-,"]);

export const isTransientNumericInput = (raw: string) => TRANSIENT_TOKENS.has(raw.trim());

export const inferDecimalDigitsFromStep = (step: number, fallback = 2) => {
  if (!Number.isFinite(step)) return fallback;
  const [, decimal = ""] = String(step).split(".");
  return decimal.length > 0 ? Math.min(decimal.length, 6) : fallback;
};

export const parseLooseNumber = (raw: string) => {
  const value = raw.trim().replace(/\s+/g, "");
  if (isTransientNumericInput(value)) return null;

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  const decimalSeparator =
    lastComma === -1 && lastDot === -1 ? null : lastComma > lastDot ? "," : ".";

  let normalized = value;
  if (decimalSeparator) {
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandsSeparator).join("");
    if (decimalSeparator === ",") {
      normalized = normalized.replace(",", ".");
    }
  }

  normalized = normalized.replace(/[^\d.-]/g, "");
  if ((normalized.match(/-/g) ?? []).length > 1) return Number.NaN;
  if (normalized.includes("-") && !normalized.startsWith("-")) return Number.NaN;
  if ((normalized.match(/\./g) ?? []).length > 1) return Number.NaN;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const formatNumberForDisplay = (
  value: number,
  format: NumberFieldFormat,
  decimalDigits = 2,
) => {
  if (format === "integer") {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(value));
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(value);
};