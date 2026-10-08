import { asMinor } from '../money.js';

export function withAmountMinor(row) {
  if (!row || typeof row !== 'object') return row;

  const minor = asMinor(row.amount_minor);
  return {
    ...row,
    amount_minor: minor == null ? null : minor.toString(),
  };
}
