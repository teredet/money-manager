import { supabase } from '../supabase.js';
import {
  fetchDefaultAccounts,
  saveDefaultAccounts,
} from '../defaultAccount.js';

export function loadDefaultAccounts() {
  return fetchDefaultAccounts(supabase);
}

export function storeDefaultAccounts(defaultAccounts) {
  return saveDefaultAccounts(defaultAccounts, supabase);
}
