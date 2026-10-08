import { supabase } from '../supabase.js';
import { DataError } from './errors.js';
import { withAmountMinor } from './rows.js';
import { getSession, requireSession } from './session.js';
import { insertTransaction } from './transactions.js';
import { accountCreateWrite, accountUpdateWrite } from './validate.js';

export async function listAccounts() {
  const session = await getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(withAmountMinor);
}

export async function createAccount(draft) {
  const built = accountCreateWrite(draft);
  if (!built.ok) throw new DataError(built.error);

  await requireSession('Увійдіть, щоб зберегти рахунок');

  const { data, error } = await supabase
    .from('accounts')
    .insert([built.value])
    .select();

  if (error) throw new Error(error.message);
  if (!data?.[0]) throw new DataError('Не вдалося зберегти рахунок');
  return withAmountMinor(data[0]);
}

export async function updateAccount(account, draft) {
  const built = accountUpdateWrite(account, draft);
  if (!built.ok) throw new DataError(built.error);

  await requireSession('Увійдіть, щоб змінити рахунок');

  const { data, error } = await supabase
    .from('accounts')
    .update(built.value.patch)
    .eq('id', account.id)
    .select();

  if (error) throw new Error(error.message);
  if (!data?.[0]) throw new DataError('Не вдалося зберегти рахунок');

  if (built.value.transaction) {
    await insertTransaction(built.value.transaction);
  }

  return withAmountMinor({
    ...account,
    ...data[0],
    name: built.value.patch.name,
    category: built.value.patch.category,
    currency: account.currency,
    amount_minor: built.value.amountMinor,
  });
}
