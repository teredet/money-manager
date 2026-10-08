import { supabase } from '../supabase.js';
import { DataError } from './errors.js';
import { withAmountMinor } from './rows.js';
import { getSession, requireSession } from './session.js';
import { transactionWrite } from './validate.js';

export async function listTransactions() {
  const session = await getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('occurred_on', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(withAmountMinor);
}

export async function insertTransaction(payload) {
  await requireSession('Увійдіть, щоб зберегти транзакцію');

  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select();

  if (error) throw new Error(error.message);
  return withAmountMinor(data?.[0] ?? null);
}

export async function createTransaction(draft) {
  const built = transactionWrite(draft);
  if (!built.ok) throw new DataError(built.error);
  return insertTransaction(built.value);
}
