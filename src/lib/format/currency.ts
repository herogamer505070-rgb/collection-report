/**
 * Format a numeric amount as a localized currency string.
 * Defaults to EGP. Uses Arabic locale so numbers render
 * in the correct direction in RTL layouts.
 */
export function formatCurrency(
  amount: number,
  currencyCode = "EGP",
  locale = "ar-EG",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with comma-separated thousands.
 */
export function formatNumber(n: number, locale = "ar-EG"): string {
  return new Intl.NumberFormat(locale).format(n);
}

/**
 * Format a decimal as a percentage string (e.g. 0–100 input).
 */
export function formatPercent(value: number, locale = "ar-EG"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}
