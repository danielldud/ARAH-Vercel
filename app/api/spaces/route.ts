import {context,sameOrigin,reply,failure,AccessError,audit,hashToken} from '@/lib/access';
import {databaseError} from '@/lib/server-supabase';
import {z} from 'zod';
export const dynamic='force-dynamic';

export async function GET(req:Request){try{
  const {db,user,space,role,owner}=await context(req);
  databaseError((await db.from('members').update({name:user.displayName}).eq('user_id',user.userId)).error);databaseError((await db.from('spaces').upsert({id:user.userId,name:'Ruang pribadi'},{onConflict:'id',ignoreDuplicates:true})).error);
  const [{data:owned,error:ownedError},{data:memberships,error:memberError},{data:people,error:peopleError},{data:logs,error:logError},{data:trash,error:trashError}]=await Promise.all([
    db.from('spaces').select('id,name').eq('id',user.userId),db.from('members').select('role,spaces(id,name)').eq('user_id',user.userId),db.from('members').select('id,name,role').eq('space',space),db.from('activity').select('id,actor,action,created').eq('space',space).order('created',{ascending:false}).limit(100),db.from('entries').select('id,kind,body,deleted_at').eq('owner',space).not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(100),
  ]);[ownedError,memberError,peopleError,logError,trashError].forEach(databaseError);
  const rooms=[...(owned||[]).map(r=>({...r,role:'admin'})),...(memberships||[]).flatMap((m:any)=>m.spaces?[{id:m.spaces.id,name:m.spaces.name,role:m.role}]:[])];
  return reply({user:{name:user.displayName,id:user.userId},space,role,owner,rooms,members:role==='admin'?people||[]:[],activity:logs||[],trash:role==='viewer'?[]:trash||[]});
}catch(e){return failure(e)}}

export async function POST(req:Request){try{
  sameOrigin(req);const body=await req.json() as any,{db,user,space}=await context(req,body.action==='join'?'read':body.action==='restore'?'write':'admin');
  if(body.action==='rename'){const name=z.string().trim().min(1).max(80).parse(body.name);databaseError((await db.from('spaces').upsert({id:space,name})).error);await audit(db,space,user.displayName,'Mengubah nama ruang');return reply({ok:true})}
  if(body.action==='invite'){const role=z.enum(['admin','editor','viewer']).parse(body.role),token=crypto.randomUUID()+crypto.randomUUID(),expires=new Date(Date.now()+7*864e5).toISOString();databaseError((await db.from('invites').insert({hash:await hashToken(token),space,role,expires})).error);await audit(db,space,user.displayName,'Membuat kode akses '+role);return reply({token,expires})}
  if(body.action==='join'){
    const token=z.string().min(30).max(150).parse(body.token),hash=await hashToken(token),now=new Date().toISOString();const {data:invite,error}=await db.from('invites').select('space,role,expires,used_by').eq('hash',hash).maybeSingle();databaseError(error);if(!invite||invite.used_by||invite.expires<now)throw new AccessError('Kode tidak valid, sudah dipakai, atau kedaluwarsa.',400);if(invite.space===user.userId)throw new AccessError('Ini ruang milikmu sendiri.',400);
    const {data:claimed,error:claimError}=await db.from('invites').update({used_by:user.userId}).eq('hash',hash).is('used_by',null).gt('expires',now).select('space,role').maybeSingle();databaseError(claimError);if(!claimed)throw new AccessError('Kode telah dipakai.',409);const member={id:crypto.randomUUID(),space:claimed.space,user_id:user.userId,name:user.displayName,role:claimed.role};const result=await db.from('members').insert(member);if(result.error){await db.from('invites').update({used_by:null}).eq('hash',hash).eq('used_by',user.userId);throw new AccessError(result.error.code==='23505'?'Kamu sudah menjadi anggota.':'Belum dapat bergabung.',409)}await audit(db,claimed.space,user.displayName,'Menerima akses ruang');return reply({ok:true,space:claimed.space});
  }
  if(body.action==='revoke-invites'){databaseError((await db.from('invites').delete().eq('space',space).is('used_by',null)).error);await audit(db,space,user.displayName,'Mencabut semua kode akses aktif');return reply({ok:true})}
  if(body.action==='member'){const id=z.string().max(100).parse(body.id),{data:target,error}=await db.from('members').select('user_id').eq('id',id).eq('space',space).maybeSingle();databaseError(error);if(!target)throw new AccessError('Anggota tidak ditemukan.',404);if(target.user_id===user.userId)throw new AccessError('Kamu tidak bisa mengubah aksesmu sendiri.',400);const role=z.enum(['admin','editor','viewer','remove']).parse(body.role);databaseError((role==='remove'?await db.from('members').delete().eq('id',id).eq('space',space):await db.from('members').update({role}).eq('id',id).eq('space',space)).error);await audit(db,space,user.displayName,role==='remove'?'Mencabut akses anggota':'Mengubah peran anggota menjadi '+role);return reply({ok:true})}
  if(body.action==='restore'){const id=z.string().max(100).parse(body.id),{data,error}=await db.from('entries').update({deleted_at:null}).eq('id',id).eq('owner',space).not('deleted_at','is',null).select('id');databaseError(error);if(!data?.length)throw new AccessError('Catatan tidak ditemukan.',404);await audit(db,space,user.displayName,'Memulihkan catatan dari tempat sampah');return reply({ok:true})}
  throw new AccessError('Tindakan tidak dikenali.',400);
}catch(e){if(e instanceof z.ZodError)return reply({error:'Periksa isian.'},400);return failure(e)}}
