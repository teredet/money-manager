import { minorDigits } from './money.js';

function rateBeforeCode(jsonText, code) {
  const marker = `"cc":"${code}"`;
  const index = jsonText.indexOf(marker);
  if (index < 0) return null;

  const slice = jsonText.slice(Math.max(0, index - 160), index);
  const match = slice.match(/"rate"\s*:\s*(\d+(?:\.\d+)?)\s*,\s*$/);
  return match?.[1] ?? null;
}

export function parseNbuRates(jsonText) {
  const rows = JSON.parse(jsonText);
  const rates = {};

  for (const row of rows) {
    if (typeof row?.cc !== 'string') continue;
    const perUnit = rateBeforeCode(jsonText, row.cc);
    if (!perUnit || minorDigits(row.cc) == null) continue;
    rates[row.cc] = {
      perUnit,
      date: typeof row.exchangedate === 'string' ? row.exchangedate : null,
    };
  }

  const date = rates.USD?.date ?? rates.EUR?.date ?? null;
  rates.UAH = { perUnit: '1', date };

  return rates;
}

export function parseBtcUahRate(jsonText) {
  const price = jsonText.match(/"uah"\s*:\s*(\d+(?:\.\d+)?)/);
  if (!price) return null;

  const updated = jsonText.match(/"last_updated_at"\s*:\s*(\d+)/);
  const date = updated
    ? new Date(Number(updated[1]) * 1000).toISOString()
    : null;

  return { perUnit: price[1], date };
}

export function formatRateDate(value) {
  if (!value) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Kyiv',
  }).format(date);
}

export async function fetchUahRates() {
  const nbuResponse = await fetch(
    'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json'
  );
  if (!nbuResponse.ok) {
    throw new Error('Не вдалося отримати курс НБУ');
  }

  const rates = parseNbuRates(await nbuResponse.text());

  try {
    const btcResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=uah&include_last_updated_at=true'
    );
    if (btcResponse.ok) {
      const btc = parseBtcUahRate(await btcResponse.text());
      if (btc) rates.BTC = btc;
    }
  } catch {
    // A missing BTC quote is refused later; fiat rates still stand.
  }

  return rates;
}
