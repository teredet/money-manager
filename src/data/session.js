import { supabase } from '../supabase.js';
import { DataError } from './errors.js';

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session ?? null;
}

export async function requireSession(message) {
  const session = await getSession();
  if (!session) throw new DataError(message);
  return session;
}

export async function currentEmail() {
  const session = await getSession();
  return session?.user?.email ?? '';
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
