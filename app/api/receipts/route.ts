import {context,sameOrigin,reply,failure,AccessError,audit} from '@/lib/access';
import {databaseError} from '@/lib/server-supabase';
import {z} from 'zod';
export const dynamic='force-dynamic';
const bucket='receipts';

export async function GET(req:Request){try{
  const {db,space}=await context(req),id=new URL(req.url).searchParams.get('id');
  if(id){const {data:row,error}=await db.from('receipts').select('*').eq('owner',space).eq('id',id).maybeSingle();databaseError(error);if(!row)throw new AccessError('Bukti tidak ditemukan.',404);const file=await db.storage.from(bucket).download(row.object_key);if(file.error||!file.data)throw new AccessError('File tidak ditemukan.',404);return new Response(await file.data.arrayBuffer(),{headers:{'Content-Type':row.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}})}
  const {data,error}=await db.from('receipts').select('id,name,mime,size,tx_id,note,direction,created').eq('owner',space).order('created',{ascending:false});databaseError(error);return reply(data||[]);
}catch(e){return failure(e)}}

export async function POST(req:Request){try{
  sameOrigin(req);const {db,space,user}=await context(req,'write');if(Number(req.headers.get('content-length')||0)>4*1024*1024)throw new AccessError('Ukuran file maksimal 4 MB.',413);const form=await req.formData(),file=form.get('file');if(!(file instanceof File)||!file.size||file.size>4*1024*1024)throw new AccessError('Pilih file hingga 4 MB.',400);
  const bytes=await file.arrayBuffer(),head=new Uint8Array(bytes),magic=Array.from(head.slice(0,8)).map(x=>x.toString(16).padStart(2,'0')).join(''),mime=magic.startsWith('255044462d')?'application/pdf':magic.startsWith('89504e470d0a1a0a')?'image/png':magic.startsWith('ffd8ff')?'image/jpeg':magic.startsWith('52494646')&&new TextDecoder().decode(head.slice(8,12))==='WEBP'?'image/webp':null;if(!mime)throw new AccessError('Gunakan PDF, JPG, PNG, atau WebP yang valid.',400);
  const note=z.string().trim().max(2000).parse(form.get('note')||''),direction=z.enum(['income','expense','statement']).parse(form.get('direction')),id=String(form.get('replaceId')||crypto.randomUUID()),objectKey=space+'/'+crypto.randomUUID(),name=file.name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,180)||'Bukti';
  const {data:previous,error:previousError}=form.get('replaceId')?await db.from('receipts').select('object_key').eq('owner',space).eq('id',id).maybeSingle():{data:null,error:null};databaseError(previousError);if(form.get('replaceId')&&!previous)throw new AccessError('Bukti tidak ditemukan.',404);
  const upload=await db.storage.from(bucket).upload(objectKey,bytes,{contentType:mime,upsert:false});if(upload.error)throw new Error(upload.error.message);
  const mutation=previous?await db.from('receipts').update({name,mime,size:file.size,object_key:objectKey,note,direction}).eq('id',id).eq('owner',space):await db.from('receipts').insert({id,owner:space,name,mime,size:file.size,object_key:objectKey,note,direction,created:new Date().toISOString()});
  if(mutation.error){await db.storage.from(bucket).remove([objectKey]);databaseError(mutation.error)}if(previous)await db.storage.from(bucket).remove([previous.object_key]);await audit(db,space,user.displayName,previous?'Mengganti file bukti transaksi':'Mengunggah bukti transaksi');return reply({ok:true,id});
}catch(e){if(e instanceof z.ZodError)return reply({error:'Periksa jenis dan keterangan bukti.'},400);return failure(e)}}

export async function PATCH(req:Request){try{
  sameOrigin(req);const {db,space,user}=await context(req,'write'),body=z.object({id:z.string().max(100),name:z.string().trim().min(1).max(180),note:z.string().max(2000),direction:z.enum(['income','expense','statement']),tx_id:z.string().max(100).nullable()}).parse(await req.json());
  if(body.tx_id){const {data,error}=await db.from('entries').select('id').eq('owner',space).eq('id',body.tx_id).eq('kind','transactions').is('deleted_at',null).maybeSingle();databaseError(error);if(!data)throw new AccessError('Transaksi tidak ditemukan.',400)}
  const {data,error}=await db.from('receipts').update({name:body.name,note:body.note,direction:body.direction,tx_id:body.tx_id}).eq('id',body.id).eq('owner',space).select('id');databaseError(error);if(!data?.length)throw new AccessError('Bukti tidak ditemukan.',404);await audit(db,space,user.displayName,'Mengubah atau menghubungkan bukti transaksi');return reply({ok:true});
}catch(e){if(e instanceof z.ZodError)return reply({error:'Periksa isian bukti.'},400);return failure(e)}}

export async function DELETE(req:Request){try{
  sameOrigin(req);const {db,space,user}=await context(req,'write'),id=new URL(req.url).searchParams.get('id'),{data:row,error}=await db.from('receipts').select('object_key').eq('owner',space).eq('id',id).maybeSingle();databaseError(error);if(!row)throw new AccessError('Bukti tidak ditemukan.',404);const removed=await db.storage.from(bucket).remove([row.object_key]);if(removed.error)throw new Error(removed.error.message);databaseError((await db.from('receipts').delete().eq('owner',space).eq('id',id)).error);await audit(db,space,user.displayName,'Menghapus file bukti (transaksi tetap tersimpan)');return reply({ok:true});
}catch(e){return failure(e)}}
