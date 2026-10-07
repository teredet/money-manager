function normalizeAccountId(accountId) {
  if (accountId == null || accountId === '') return null;
  return String(accountId);
}

export function defaultAccountsFromRow(row) {
  return {
    expense: normalizeAccountId(row?.expense_account_id),
    income: normalizeAccountId(row?.income_account_id),
  };
}

function toDatabaseAccountId(accountId) {
  const normalized = normalizeAccountId(accountId);
  if (normalized == null) return null;

  const number = Number(normalized);
  if (!Number.isSafeInteger(number)) return null;
  return number;
}

export function getDefaultAccountId(type, accounts, defaultAccounts = {}) {
  const key = type === 'income' ? 'income' : 'expense';
  const preferredAccountId = normalizeAccountId(defaultAccounts?.[key]);

  if (preferredAccountId != null && Array.isArray(accounts)) {
    const matchesPreferred = accounts.some(
      (account) => String(account.id) === preferredAccountId,
    );

    if (matchesPreferred) return Number(preferredAccountId);
  }

  if (!Array.isArray(accounts) || !accounts.length) return null;

  return Number(accounts[0].id);
}

export async function fetchDefaultAccounts(client) {
  const { data, error } = await client
    .from('user_settings')
    .select('expense_account_id, income_account_id')
    .maybeSingle();

  if (error) throw error;
  return defaultAccountsFromRow(data);
}

export async function saveDefaultAccounts(defaultAccounts, client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('Увійдіть, щоб зберегти налаштування');

  const expense = normalizeAccountId(defaultAccounts?.expense);
  const income = normalizeAccountId(defaultAccounts?.income);
  const { error } = await client.from('user_settings').upsert({
    user_id: userId,
    expense_account_id: toDatabaseAccountId(expense),
    income_account_id: toDatabaseAccountId(income),
  });

  if (error) throw error;

  return { expense, income };
}
