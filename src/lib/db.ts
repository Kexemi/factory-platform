/**
 * Supabase database client — shared across all API routes.
 */
import { createClient } from '@supabase/supabase-js';

let db: any = null;

export function getDb() {
  if (db) return db;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  db = createClient(url, key);
  return db;
}

export async function getBusiness(slug: string) {
  const { data } = await getDb().from('businesses').select('*').eq('slug', slug).single();
  return data;
}

export async function getBusinessById(id: number) {
  const { data } = await getDb().from('businesses').select('*').eq('id', id).single();
  return data;
}
