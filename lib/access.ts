import {publicSupabase,serverSupabase,databaseError} from './server-supabase';

export class AccessError extends Error{constructor(message:string,public status=403){super(message)}}
export const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export function failure(error:unknown){if(error instanceof AccessError)return reply({error:error.message},error.status);console.error('ARAH request failed',error);return reply({error:'Permintaan belum berhasil. Coba lagi.'},503)}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new AccessError('Permintaan tidak diizinkan.');}

export async function authenticatedUser(req:Request){
  const authorization=req.headers.get('authorization');
  if(!authorization?.startsWith('Bearer '))throw new AccessError('Masuk ke akun ARAH untuk melanjutkan.',401);
  const token=authorization.slice(7),{data,error}=await publicSupabase().auth.getUser(token);
  if(error||!data.user?.id||!data.user.email)throw new AccessError('Sesi berakhir. Silakan masuk kembali.',401);
  const meta=data.user.user_metadata||{},fullName=typeof meta.name==='string'?meta.name:typeof meta.full_name==='string'?meta.full_name:null;
  return {userId:data.user.id,email:data.user.email,displayName:fullName||data.user.email,fullName};
}

export async function context(req:Request,permission:'read'|'write'|'admin'='read'){
  const user=await authenticatedUser(req),db=serverSupabase(),space=new URL(req.url).searchParams.get('space')||user.userId;
  let role='admin',owner=space===user.userId;
  if(!owner){const {data,error}=await db.from('members').select('role').eq('space',space).eq('user_id',user.userId).maybeSingle();databaseError(error);if(!data)throw new AccessError('Kamu tidak memiliki akses ke ruang ini.');role=data.role;}
  if(permission==='write'&&role==='viewer'||permission==='admin'&&role!=='admin')throw new AccessError('Peranmu tidak mengizinkan tindakan ini.');
  return {user,db,space,role,owner};
}

export async function audit(db:ReturnType<typeof serverSupabase>,space:string,actor:string,action:string){databaseError((await db.from('activity').insert({id:crypto.randomUUID(),space,actor,action,created:new Date().toISOString()})).error)}
export const hashToken=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
