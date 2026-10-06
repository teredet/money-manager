const BTC = 'BTC';

export function minorDigits(currency) {
  if (currency === BTC) return 8;
  if (!/^[A-Z]{3}$/.test(currency)) return null;

  try {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    return null;
  }
}

export function parseMajorToMinor(input, currency) {
  const digits = minorDigits(currency);
  if (digits == null || input == null) return null;

  const raw = String(input).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;

  const negative = raw.startsWith('-');
  const [whole, fraction = ''] = raw.replace('-', '').split('.');
  if (fraction.length > digits) return null;

  const scale = 10n ** BigInt(digits);
  const minor =
    BigInt(whole) * scale + BigInt((fraction + '0'.repeat(digits)).slice(0, digits) || '0');

  return negative ? -minor : minor;
}

export function formatMinor(minor, currency) {
  const digits = minorDigits(currency);
  if (digits == null || typeof minor !== 'bigint') return '';

  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const scale = 10n ** BigInt(digits);
  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(digits, '0');
  const major = Number(`${negative ? '-' : ''}${whole}.${fraction}`);

  if (currency === BTC) {
    const number = new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);
    return `${number} ₿`;
  }

  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(major);
}

function divRoundHalfAwayFromZero(numerator, denominator) {
  if (denominator === 0n) return null;

  const negative = numerator < 0n !== denominator < 0n;
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const absoluteDenominator = denominator < 0n ? -denominator : denominator;
  const quotient = absoluteNumerator / absoluteDenominator;
  const remainder = absoluteNumerator % absoluteDenominator;
  const rounded =
    remainder * 2n >= absoluteDenominator ? quotient + 1n : quotient;

  return negative ? -rounded : rounded;
}

export function convertMinor(amountMinor, fromCurrency, toCurrency, ratePerUnit) {
  if (typeof amountMinor !== 'bigint') return null;
  if (fromCurrency === toCurrency) return amountMinor;

  const fromDigits = minorDigits(fromCurrency);
  const toDigits = minorDigits(toCurrency);
  if (fromDigits == null || toDigits == null) return null;

  const rate = String(ratePerUnit).trim();
  if (!/^\d+(\.\d+)?$/.test(rate)) return null;

  const [whole, fraction = ''] = rate.split('.');
  const rateScale = 10n ** BigInt(fraction.length);
  const rateNumerator = BigInt(whole) * rateScale + BigInt(fraction || '0');
  const numerator = amountMinor * rateNumerator * 10n ** BigInt(toDigits);
  const denominator = rateScale * 10n ** BigInt(fromDigits);

  return divRoundHalfAwayFromZero(numerator, denominator);
}

export function asMinor(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  return null;
}
