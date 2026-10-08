import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountCreateWrite,
  accountUpdateWrite,
  transactionWrite,
  validateNote,
} from './validate.js';

const accounts = [
  { id: 1, currency: 'UAH', amount_minor: '1000', name: 'Cash' },
  { id: '2', currency: 'USD', amount_minor: '500', name: 'Card' },
];

const catalogs = {
  categories: ['Cash', 'Cards'],
  currencies: ['UAH', 'USD', 'EUR', 'BTC', 'USDT'],
};

function expense(overrides = {}) {
  return {
    accounts,
    accountId: 1,
    kind: 'expense',
    category: 'Food',
    amount: '10.50',
    occurredOn: '2026-10-08',
    note: '  lunch  ',
    ...overrides,
  };
}

test('writes a transaction amount as an exact minor-unit string', () => {
  const result = transactionWrite(expense());

  assert.equal(result.ok, true);
  assert.equal(result.value.amount_minor, '1050');
  assert.equal(typeof result.value.amount_minor, 'string');
  assert.equal(result.value.account_id, 1);
  assert.equal(result.value.note, 'lunch');
  assert.equal(result.value.occurred_on, '2026-10-08');
});

test('preserves a minor amount that JavaScript Number cannot represent', () => {
  const result = transactionWrite(
    expense({ amount: '9007199254740993.01' }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.amount_minor, '900719925474099301');
  assert.notEqual(
    Number(result.value.amount_minor).toString(),
    result.value.amount_minor,
  );
});

test('requires a positive amount and a real date', () => {
  assert.equal(transactionWrite(expense({ amount: '' })).error, 'Некоректна сума');
  assert.equal(transactionWrite(expense({ amount: '0' })).error, 'Некоректна сума');
  assert.equal(transactionWrite(expense({ amount: '10.555' })).error, 'Некоректна сума');
  assert.equal(transactionWrite(expense({ amount: 10.5 })).error, 'Некоректна сума');
  assert.equal(transactionWrite(expense({ occurredOn: '' })).error, 'Вкажіть дату');
  assert.equal(
    transactionWrite(expense({ occurredOn: '2026-02-31' })).error,
    'Некоректна дата',
  );
  assert.equal(
    transactionWrite(expense({ occurredOn: '06.10.2026' })).error,
    'Вкажіть дату',
  );
});

test('keeps the transaction category and currency consistent with the account', () => {
  assert.equal(
    transactionWrite(expense({ category: 'Salary' })).error,
    'Категорія не відповідає типу транзакції',
  );
  assert.equal(
    transactionWrite(expense({ kind: 'income', category: 'Food' })).error,
    'Категорія не відповідає типу транзакції',
  );
  assert.equal(
    transactionWrite(expense({ currency: 'USD' })).error,
    'Валюта не збігається з рахунком',
  );
  assert.equal(
    transactionWrite(expense({ kind: 'income', category: 'Salary', currency: 'UAH' }))
      .ok,
    true,
  );
});

test('rejects an account reference that is missing or not owned', () => {
  assert.equal(
    transactionWrite(expense({ accountId: '' })).error,
    'Додайте рахунок, щоб створити транзакцію',
  );
  assert.equal(
    transactionWrite(expense({ accountId: '99' })).error,
    'Обраний рахунок не знайдено',
  );
  assert.equal(
    transactionWrite(expense({ accountId: 'abc' })).error,
    'Обраний рахунок не знайдено',
  );
  assert.equal(
    transactionWrite(expense({ accountId: 0 })).error,
    'Обраний рахунок не знайдено',
  );
  assert.equal(transactionWrite(expense({ accountId: '2' })).value.account_id, 2);
});

test('stores an empty note as null and rejects a malformed one', () => {
  assert.equal(validateNote('   ').value, null);
  assert.equal(validateNote(null).value, null);
  assert.equal(transactionWrite(expense({ note: '' })).value.note, null);
  assert.equal(transactionWrite(expense({ note: 'ok\nline' })).value.note, 'ok\nline');
  assert.equal(validateNote('bad\u0000note').error, 'Некоректна нотатка');
  assert.equal(validateNote(12).error, 'Некоректна нотатка');
  assert.equal(validateNote('x'.repeat(501)).error, 'Нотатка задовга');
});

test('requires an account category and currency from the same catalogs', () => {
  const created = accountCreateWrite({
    name: '  Cash box ',
    category: 'Cash',
    currency: 'UAH',
    amount: '0',
    ...catalogs,
  });

  assert.equal(created.ok, true);
  assert.equal(created.value.name, 'Cash box');
  assert.equal(created.value.amount_minor, '0');
  assert.equal(typeof created.value.amount_minor, 'string');

  assert.equal(
    accountCreateWrite({
      name: 'Card',
      category: 'Food',
      currency: 'UAH',
      amount: '1',
      ...catalogs,
    }).error,
    'Невідома категорія',
  );
  assert.equal(
    accountCreateWrite({
      name: 'Card',
      category: 'Cash',
      currency: 'GBP',
      amount: '1',
      ...catalogs,
    }).error,
    'Невідома валюта',
  );
  assert.equal(
    accountCreateWrite({
      name: 'Card',
      category: 'Cash',
      currency: 'USDT',
      amount: '1',
      ...catalogs,
    }).error,
    'Невідома валюта',
  );
});

test('adjusts an account balance with an exact minor-unit transaction', () => {
  const same = accountUpdateWrite(accounts[0], {
    name: 'Cash',
    category: 'Cards',
    currency: 'UAH',
    amount: '10',
    categories: catalogs.categories,
  });
  assert.equal(same.ok, true);
  assert.equal(same.value.transaction, null);
  assert.equal(same.value.patch.amount_minor, undefined);

  const changed = accountUpdateWrite(accounts[0], {
    name: 'Cash',
    category: 'Cash',
    currency: 'UAH',
    amount: '10.50',
    categories: catalogs.categories,
    occurredOn: '2026-10-08',
  });
  assert.equal(changed.ok, true);
  assert.equal(changed.value.transaction.kind, 'income');
  assert.equal(changed.value.transaction.category, 'Balance change');
  assert.equal(changed.value.transaction.amount_minor, '50');
  assert.equal(changed.value.amountMinor, '1050');
  assert.equal(changed.value.patch.amount_minor, undefined);

  const mismatched = accountUpdateWrite(accounts[0], {
    name: 'Cash',
    category: 'Cash',
    currency: 'USD',
    amount: '10',
    categories: catalogs.categories,
  });
  assert.equal(mismatched.error, 'Валюта не збігається з рахунком');
});

test('rejects a balance-change category from the transaction form', () => {
  assert.equal(
    transactionWrite(expense({ category: 'Balance change' })).error,
    'Категорія не відповідає типу транзакції',
  );
});
