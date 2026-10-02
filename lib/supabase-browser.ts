'use client';

import {createClient, type SupabaseClient} from '@supabase/supabase-js';

let client:SupabaseClient|null=null;

export function supabase(){
  if(client)return client;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error('Supabase belum dikonfigurasi. Isi file .env lalu jalankan ulang pnpm dev.');
  client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}

export async function apiFetch(input:RequestInfo|URL,init:RequestInit={}){
  const {data}=await supabase().auth.getSession();
  const headers=new Headers(init.headers);
  if(data.session)headers.set('Authorization','Bearer '+data.session.access_token);
  return fetch(input,{...init,headers});
}
