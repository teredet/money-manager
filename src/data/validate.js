import {
  asMinor,
  formatMinorInput,
  minorDigits,
  minorToWire,
  parseMajorToMinor,
} from '../money.js';

export const NOTE_MAX_LENGTH = 500;
export const CATEGORY_MAX_LENGTH = 80;

export const INCOME_CATEGORIES = Object.freeze([
  'Salary',
  'Freelance',
  'Investments',
  'Other',
]);

export const EXPENSE_CATEGORIES = Object.freeze([
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Other',
]);

export const BALANCE_CHANGE_CATEGORY = 'Balance change';

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function fail(error) {
  return { ok: false, error };
}

function ok(value) {
  return { ok: true, value };
}

export function categoriesForKind(kind) {
  if (kind === 'income') return INCOME_CATEGORIES;
  if (kind === 'expense') return EXPENSE_CATEGORIES;
  return [];
}

export function todayIsoDate(timeZone = 'Europe/Kyiv', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function canonicalAccountId(accountId) {
  if (typeof accountId === 'bigint') {
    if (accountId <= 0n) return null;
    return accountId.toString();
  }

  if (typeof accountId === 'number') {
    if (!Number.isSafeInteger(accountId) || accountId <= 0) return null;
    return String(accountId);
  }

  if (typeof accountId === 'string' && /^[1-9]\d*$/.test(accountId)) {
    return accountId;
  }

  return null;
}

export function wireAccountId(accountId) {
  const canonical = canonicalAccountId(accountId);
  if (canonical == null) return null;
  if (typeof accountId === 'number') return accountId;
  if (canonical.length < 16) return Number(canonical);
  return canonical;
}

export function validateNote(note) {
  if (note == null) return ok(null);
  if (typeof note !== 'string' || CONTROL_CHARS.test(note)) {
    return fail('Некоректна нотатка');
  }

  const trimmed = note.trim();
  if (!trimmed) return ok(null);
  if (trimmed.length > NOTE_MAX_LENGTH) return fail('Нотатка задовга');
  return ok(trimmed);
}

export function validateOccurredOn(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fail('Вкажіть дату');
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return fail('Некоректна дата');
  }

  return ok(value);
}

export function validateAccountCurrencyCategory({
  category,
  currency,
  categories,
  currencies,
}) {
  if (typeof category !== 'string' || !categories?.includes(category)) {
    return fail('Невідома категорія');
  }
  if (typeof currency !== 'string' || !currencies?.includes(currency)) {
    return fail('Невідома валюта');
  }
  if (minorDigits(currency) == null) {
    return fail('Невідома валюта');
  }

  return ok({ category, currency });
}

export function validateAccountRef(accountId, accounts) {
  if (accountId == null || accountId === '') {
    return fail('Додайте рахунок, щоб створити транзакцію');
  }

  const id = canonicalAccountId(accountId);
  if (id == null || !Array.isArray(accounts)) {
    return fail('Обраний рахунок не знайдено');
  }

  const account = accounts.find((item) => canonicalAccountId(item?.id) === id);
  if (!account) return fail('Обраний рахунок не знайдено');

  const stored = account.currency;
  const currency =
    minorDigits(stored) != null ? stored : String(stored || '').toUpperCase();
  if (minorDigits(currency) == null) {
    return fail('Валюта рахунку не підтримується');
  }

  return ok({ account, id, currency });
}

function validateName(name) {
  if (typeof name !== 'string' || !name.trim()) return fail('Вкажіть назву');
  return ok(name.trim());
}

function validateAccountAmount(amount, currency) {
  if (typeof amount !== 'string') return fail('Некоректна сума');
  const minor = parseMajorToMinor(amount, currency);
  if (minor == null) return fail('Некоректна сума');
  return ok(minor);
}

function validateTransactionAmount(amount, currency) {
  const parsed = validateAccountAmount(amount, currency);
  if (!parsed.ok || parsed.value <= 0n) return fail('Некоректна сума');
  return parsed;
}

export function accountCreateWrite(draft) {
  const name = validateName(draft?.name);
  if (!name.ok) return name;

  const pair = validateAccountCurrencyCategory({
    category: draft?.category,
    currency: draft?.currency,
    categories: draft?.categories,
    currencies: draft?.currencies,
  });
  if (!pair.ok) return pair;

  const amount = validateAccountAmount(draft?.amount, pair.value.currency);
  if (!amount.ok) return amount;

  return ok({
    name: name.value,
    category: pair.value.category,
    currency: pair.value.currency,
    amount_minor: minorToWire(amount.value),
  });
}

export function accountUpdateWrite(account, draft) {
  if (!account || wireAccountId(account.id) == null) {
    return fail('Обраний рахунок не знайдено');
  }

  const name = validateName(draft?.name);
  if (!name.ok) return name;

  if (
    typeof draft?.category !== 'string' ||
    !draft.categories?.includes(draft.category)
  ) {
    return fail('Невідома категорія');
  }

  const currency = account.currency;
  if (minorDigits(currency) == null) {
    return fail('Валюта рахунку не підтримується');
  }
  if (
    draft.currency != null &&
    draft.currency !== '' &&
    draft.currency !== currency
  ) {
    return fail('Валюта не збігається з рахунком');
  }

  const next = validateAccountAmount(draft?.amount, currency);
  if (!next.ok) return next;

  const previous = asMinor(account.amount_minor);
  const patch = {
    name: name.value,
    category: draft.category,
  };
  let transaction = null;

  if (previous == null) {
    patch.amount_minor = minorToWire(next.value);
  } else if (previous !== next.value) {
    const delta = next.value - previous;
    const magnitude = delta < 0n ? -delta : delta;
    const written = transactionWrite(
      {
        accounts: [account],
        accountId: account.id,
        kind: delta > 0n ? 'income' : 'expense',
        category: BALANCE_CHANGE_CATEGORY,
        currency,
        amount: formatMinorInput(magnitude, currency),
        occurredOn: draft.occurredOn ?? todayIsoDate(),
        note: null,
      },
      { allowBalanceChange: true },
    );
    if (!written.ok) return written;
    transaction = written.value;
  }

  return ok({
    id: wireAccountId(account.id),
    patch,
    amountMinor: minorToWire(next.value),
    transaction,
  });
}

export function transactionWrite(draft, options = {}) {
  const ref = validateAccountRef(draft?.accountId, draft?.accounts);
  if (!ref.ok) return ref;

  const kind = draft?.kind;
  if (kind !== 'income' && kind !== 'expense') return fail('Невідомий тип');

  const category =
    typeof draft?.category === 'string' ? draft.category.trim() : '';
  if (!category || category.length > CATEGORY_MAX_LENGTH) {
    return fail('Невідома категорія');
  }

  const allowed = categoriesForKind(kind);
  const balanceChange =
    options.allowBalanceChange === true && category === BALANCE_CHANGE_CATEGORY;
  if (!balanceChange && !allowed.includes(category)) {
    return fail('Категорія не відповідає типу транзакції');
  }

  if (
    draft.currency != null &&
    draft.currency !== '' &&
    draft.currency !== ref.value.currency
  ) {
    return fail('Валюта не збігається з рахунком');
  }

  const amount = validateTransactionAmount(draft?.amount, ref.value.currency);
  if (!amount.ok) return amount;

  const occurred = validateOccurredOn(draft?.occurredOn);
  if (!occurred.ok) return occurred;

  const note = validateNote(draft?.note);
  if (!note.ok) return note;

  return ok({
    account_id: wireAccountId(ref.value.id),
    kind,
    category,
    amount_minor: minorToWire(amount.value),
    occurred_on: occurred.value,
    note: note.value,
  });
}
