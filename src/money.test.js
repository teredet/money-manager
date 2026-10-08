import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertMinor,
  convertMinorDivide,
  formatMinor,
  formatMinorInput,
  minorDigits,
  minorToWire,
  parseMajorToMinor,
  sharePercent,
} from './money.js';
import { formatRateDate, parseBtcUahRate, parseNbuRates } from './rates.js';
import {
  defaultAccountsFromRow,
  getDefaultAccountId,
} from './defaultAccount.js';

test('stores hryvnia and cents as integer minor units', () => {
  assert.equal(parseMajorToMinor('10.50', 'UAH'), 1050n);
  assert.equal(parseMajorToMinor('10,5', 'USD'), 1050n);
  assert.equal(parseMajorToMinor('1', 'EUR'), 100n);
  assert.equal(parseMajorToMinor('10.555', 'UAH'), null);
  assert.equal(parseMajorToMinor('0.00000001', 'BTC'), 1n);
  assert.equal(parseMajorToMinor('1.123456789', 'BTC'), null);
});

test('formats minor units in uk-UA with fraction digits', () => {
  assert.equal(
    formatMinor(1050n, 'UAH'),
    new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(10.5)
  );
  assert.match(formatMinor(1n, 'BTC'), /0,00000001/);
  assert.match(formatMinor(1n, 'BTC'), /₿/);
});

test('formats values that fit in Number the same way as Intl', () => {
  const cases = [
    [0n, 'UAH'],
    [1n, 'UAH'],
    [10n, 'UAH'],
    [1050n, 'UAH'],
    [-1050n, 'USD'],
    [100000050n, 'EUR'],
  ];

  for (const [minor, currency] of cases) {
    const digits = minorDigits(currency);
    const negative = minor < 0n;
    const absolute = negative ? -minor : minor;
    const scale = 10n ** BigInt(digits);
    const whole = absolute / scale;
    const fraction = (absolute % scale).toString().padStart(digits, '0');
    const major = Number(`${negative ? '-' : ''}${whole}.${fraction}`);
    const expected = new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);

    assert.equal(formatMinor(minor, currency), expected);
  }
});

test('keeps minor digits that do not fit in a Number', () => {
  const minor = 100000000000000000050n;

  assert.equal(
    formatMinor(minor, 'UAH').replace(/\D/g, ''),
    '100000000000000000050',
  );
  assert.equal(formatMinorInput(minor, 'UAH'), '1000000000000000000.5');
  assert.equal(parseMajorToMinor(formatMinorInput(minor, 'UAH'), 'UAH'), minor);
  assert.equal(minorToWire(minor), '100000000000000000050');
  assert.notEqual(Number(minorToWire(minor)).toString(), minorToWire(minor));
});

test('rounds shares and inverse quotes in minor units', () => {
  assert.equal(sharePercent(1n, 3n), '33%');
  assert.equal(sharePercent(2n, 3n), '67%');
  assert.equal(sharePercent(1n, 2n), '50%');
  assert.equal(sharePercent(0n, 0n), '0%');
  assert.equal(convertMinorDivide(4506n, 'UAH', 'USD', '45.0564'), 100n);
});

test('converts with integer rounding and refuses a rate-less currency', () => {
  assert.equal(convertMinor(100n, 'USD', 'UAH', '45.0564'), 4506n);
  assert.equal(convertMinor(100n, 'EUR', 'UAH', '50.483'), 5048n);
  assert.equal(convertMinor(100000000n, 'BTC', 'UAH', '3871255'), 387125500n);
  assert.equal(convertMinor(100n, 'USD', 'UAH', '45.0564'), 4506n);
  assert.equal(minorDigits('USDT'), null);
  assert.equal(convertMinor(100n, 'USDT', 'UAH', '40'), null);
});

test('reads NBU and BTC quotes as decimal strings with dates', () => {
  const nbu = `{
    "rate":45.0564,"cc":"USD","exchangedate":"06.10.2026"
  },{
    "rate":50.483,"cc":"EUR","exchangedate":"06.10.2026"
  }`;
  const rates = parseNbuRates(`[${nbu}]`);

  assert.equal(rates.USD.perUnit, '45.0564');
  assert.equal(rates.EUR.perUnit, '50.483');
  assert.equal(rates.UAH.perUnit, '1');
  assert.equal(rates.USD.date, '06.10.2026');

  const btc = parseBtcUahRate(
    '{"bitcoin":{"uah":3871255,"last_updated_at":1791288510}}'
  );
  assert.equal(btc.perUnit, '3871255');
  assert.equal(formatRateDate('06.10.2026'), '06.10.2026');
  assert.equal(formatRateDate(btc.date), '06.10.2026');
});

test('keeps separate default accounts for income and expenses', () => {
  const accounts = [
    { id: 1, name: 'Cash' },
    { id: 2, name: 'Card' },
    { id: 5, name: 'Savings' },
  ];
  const defaults = defaultAccountsFromRow({
    expense_account_id: 2,
    income_account_id: 5,
  });

  assert.deepEqual(defaults, { expense: '2', income: '5' });
  assert.deepEqual(defaultAccountsFromRow(null), {
    expense: null,
    income: null,
  });
  assert.equal(getDefaultAccountId('expense', accounts, defaults), 2);
  assert.equal(getDefaultAccountId('income', accounts, defaults), 5);
  assert.equal(getDefaultAccountId('expense', accounts, { expense: '99' }), 1);
  assert.equal(getDefaultAccountId('expense', accounts), 1);
  assert.equal(getDefaultAccountId('expense', [], defaults), null);
});
