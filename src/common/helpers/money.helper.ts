// Prices come from Postgres as decimal strings ("1200.00").
// All maths is done in whole cents (integers) so there are no floating-point errors.

export function toCents(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

export function fromCents(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}