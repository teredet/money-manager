import assert from 'node:assert/strict';
import test from 'node:test';
import { convertMinor, formatMinor, minorDigits, parseMajorToMinor } from './money.js';
import { formatRateDate, parseBtcUahRate, parseNbuRates } from './rates.js';

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
