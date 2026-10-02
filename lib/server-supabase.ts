import {createClient} from '@supabase/supabase-js';

export function serverSupabase(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase server environment is incomplete');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export function publicSupabase(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error('Supabase public environment is incomplete');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export function databaseError(error:{message:string}|null){if(error)throw new Error(error.message)}
