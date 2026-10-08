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

function localeMinusSign() {
  return (
    new Intl.NumberFormat('uk-UA')
      .formatToParts(-1)
      .find((part) => part.type === 'minusSign')?.value ?? '-'
  );
}

function localeDecimalSeparator() {
  return (
    new Intl.NumberFormat('uk-UA')
      .formatToParts(1.1)
      .find((part) => part.type === 'decimal')?.value ?? ','
  );
}

function formatGroupedInteger(whole) {
  return new Intl.NumberFormat('uk-UA', {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(whole);
}

function formatExactDecimal(whole, fraction, digits, negative) {
  const integer = formatGroupedInteger(whole);
  const numeric =
    digits > 0 ? `${integer}${localeDecimalSeparator()}${fraction}` : integer;
  return negative ? `${localeMinusSign()}${numeric}` : numeric;
}

function formatExactCurrency(whole, fraction, digits, negative, currency) {
  const sample = new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).formatToParts(negative ? -1 : 1);

  const integer = formatGroupedInteger(whole);
  let replacedInteger = false;

  return sample
    .map((part) => {
      if (part.type === 'integer' || part.type === 'group') {
        if (part.type === 'group' || replacedInteger) return '';
        replacedInteger = true;
        return integer;
      }
      if (part.type === 'fraction') return fraction;
      return part.value;
    })
    .join('');
}

export function formatMinor(minor, currency) {
  const digits = minorDigits(currency);
  if (digits == null || typeof minor !== 'bigint') return '';

  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const scale = 10n ** BigInt(digits);
  const whole = absolute / scale;
  const fraction =
    digits === 0 ? '' : (absolute % scale).toString().padStart(digits, '0');

  if (currency === BTC) {
    return `${formatExactDecimal(whole, fraction, digits, negative)} ₿`;
  }

  return formatExactCurrency(whole, fraction, digits, negative, currency);
}

export function formatMinorInput(value, currency) {
  const minor = asMinor(value);
  const digits = minorDigits(currency);
  if (minor == null || digits == null) return '';

  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const scale = 10n ** BigInt(digits);
  const whole = absolute / scale;
  const fraction =
    digits === 0
      ? ''
      : (absolute % scale).toString().padStart(digits, '0').replace(/0+$/, '');
  const sign = negative ? '-' : '';

  return fraction
    ? `${sign}${whole.toString()}.${fraction}`
    : `${sign}${whole.toString()}`;
}

export function minorToWire(minor) {
  if (typeof minor !== 'bigint') return null;
  return minor.toString();
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

function parseRate(ratePerUnit) {
  const rate = String(ratePerUnit).trim();
  if (!/^\d+(\.\d+)?$/.test(rate)) return null;

  const [whole, fraction = ''] = rate.split('.');
  const rateScale = 10n ** BigInt(fraction.length);
  const rateNumerator = BigInt(whole) * rateScale + BigInt(fraction || '0');
  return { rateScale, rateNumerator };
}

export function convertMinor(amountMinor, fromCurrency, toCurrency, ratePerUnit) {
  if (typeof amountMinor !== 'bigint') return null;
  if (fromCurrency === toCurrency) return amountMinor;

  const fromDigits = minorDigits(fromCurrency);
  const toDigits = minorDigits(toCurrency);
  if (fromDigits == null || toDigits == null) return null;

  const rate = parseRate(ratePerUnit);
  if (!rate) return null;

  const numerator =
    amountMinor * rate.rateNumerator * 10n ** BigInt(toDigits);
  const denominator = rate.rateScale * 10n ** BigInt(fromDigits);

  return divRoundHalfAwayFromZero(numerator, denominator);
}

export function convertMinorDivide(amountMinor, fromCurrency, toCurrency, ratePerUnit) {
  if (typeof amountMinor !== 'bigint') return null;
  if (fromCurrency === toCurrency) return amountMinor;

  const fromDigits = minorDigits(fromCurrency);
  const toDigits = minorDigits(toCurrency);
  if (fromDigits == null || toDigits == null) return null;

  const rate = parseRate(ratePerUnit);
  if (!rate || rate.rateNumerator === 0n) return null;

  const numerator = amountMinor * rate.rateScale * 10n ** BigInt(toDigits);
  const denominator = rate.rateNumerator * 10n ** BigInt(fromDigits);

  return divRoundHalfAwayFromZero(numerator, denominator);
}

export function sharePercent(part, total) {
  if (typeof part !== 'bigint' || typeof total !== 'bigint' || total === 0n) {
    return '0%';
  }

  const rounded = divRoundHalfAwayFromZero(part * 100n, total);
  if (rounded == null) return '0%';
  return `${rounded}%`;
}

export function asMinor(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  return null;
}
