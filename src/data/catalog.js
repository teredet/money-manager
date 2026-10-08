import { supabase } from '../supabase.js';

export async function listAccountCatalog() {
  const [categoryResult, currencyResult] = await Promise.all([
    supabase.from('accounts_category').select('name').order('id'),
    supabase.from('currency').select('name').order('id'),
  ]);

  if (categoryResult.error || currencyResult.error) {
    throw new Error(
      categoryResult.error?.message || currencyResult.error?.message,
    );
  }

  return {
    categories: categoryResult.data.map((row) => row.name),
    currencies: currencyResult.data.map((row) => row.name),
  };
}
