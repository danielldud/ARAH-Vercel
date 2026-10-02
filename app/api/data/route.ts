import {empty} from '@/lib/finance';
import {txSchema,projectSchema,eventSchema,settingsSchema} from '@/lib/validation';
import {z} from 'zod';
import {context,sameOrigin,reply,failure,AccessError,audit} from '@/lib/access';
import {databaseError} from '@/lib/server-supabase';
export const dynamic='force-dynamic';

export async function GET(req:Request){try{
  const {db,space}=await context(req);
  const [{data:rows,error:rowError},{data:preference,error:prefError}]=await Promise.all([
    db.from('entries').select('id,kind,body').eq('owner',space).is('deleted_at',null),
    db.from('preferences').select('body').eq('owner',space).maybeSingle(),
  ]);databaseError(rowError);databaseError(prefError);const data=empty();
  for(const row of rows||[]){const kind=row.kind as 'transactions'|'projects'|'events';data[kind].push({...row.body,id:row.id} as never)}
  if(preference)data.settings=preference.body;data.transactions.sort((a,b)=>b.date.localeCompare(a.date));data.events.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));return reply(data);
}catch(e){return failure(e)}}

export async function POST(req:Request){try{
  sameOrigin(req);if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'Format data tidak valid.'},415);const raw=await req.text();if(raw.length>2e6)return reply({error:'File terlalu besar.'},413);
  const {action,data,kind,id}=JSON.parse(raw),{db,space,user}=await context(req,action==='settings'?'admin':'write');
  if(action==='settings'){const settings=settingsSchema.parse(data);databaseError((await db.from('preferences').upsert({owner:space,body:settings})).error);await audit(db,space,user.displayName,'Mengubah saldo awal & target');return reply({ok:true})}
  if(action==='delete'){
    const entryKind=z.enum(['transactions','projects','events']).parse(kind),key=z.string().max(100).parse(id);
    if(entryKind==='projects'){const {data:transactions,error}=await db.from('entries').select('id,body').eq('owner',space).eq('kind','transactions').is('deleted_at',null);databaseError(error);for(const tx of transactions||[])if(tx.body?.projectId===key)databaseError((await db.from('entries').update({body:{...tx.body,projectId:''}}).eq('id',tx.id).eq('owner',space)).error)}
    const {data:removed,error}=await db.from('entries').update({deleted_at:new Date().toISOString()}).eq('owner',space).eq('kind',entryKind).eq('id',key).is('deleted_at',null).select('id');databaseError(error);if(!removed?.length)throw new AccessError('Catatan tidak ditemukan.',404);await audit(db,space,user.displayName,'Memindahkan '+entryKind+' ke tempat sampah');return reply({ok:true});
  }
  const schemas={transactions:txSchema,projects:projectSchema,events:eventSchema},isImport=action==='import',entryKind=isImport?'transactions':z.enum(['transactions','projects','events']).parse(action),parsed=isImport?z.array(txSchema).min(1).max(500).parse(data):[schemas[entryKind as keyof typeof schemas].parse(data)];
  const receiptId=!isImport&&entryKind==='transactions'&&data?.receiptId?z.string().uuid().parse(data.receiptId):null;
  if(receiptId){const {data:proof,error}=await db.from('receipts').select('tx_id').eq('owner',space).eq('id',receiptId).maybeSingle();databaseError(error);if(!proof)throw new AccessError('Bukti tidak ditemukan.',404);if(proof.tx_id)throw new AccessError('Bukti sudah terhubung. Edit transaksi yang ada untuk menghindari duplikasi.',409)}
  let saved=0,firstId='';
  for(const item of parsed){
    if(entryKind==='transactions'&&'projectId'in item&&item.projectId){const {data:project,error}=await db.from('entries').select('id').eq('owner',space).eq('kind','projects').eq('id',item.projectId).is('deleted_at',null).maybeSingle();databaseError(error);if(!project)throw new AccessError('Proyek terkait tidak ditemukan.',400)}
    const {id:entryId,...incoming}=item,key=isImport?crypto.randomUUID():entryId||(receiptId?'proof-'+receiptId:crypto.randomUUID());firstId||=key;
    if(entryId&&!isImport){const {data:existing,error}=await db.from('entries').select('body').eq('owner',space).eq('kind',entryKind).eq('id',key).is('deleted_at',null).maybeSingle();databaseError(error);if(!existing)throw new AccessError('Catatan tidak ditemukan atau sudah dihapus.',404);const body=entryKind==='transactions'&&existing.body?.recordedAt?{...incoming,recordedAt:existing.body.recordedAt}:incoming;databaseError((await db.from('entries').update({body}).eq('owner',space).eq('kind',entryKind).eq('id',key)).error);saved++;
    }else{const body=entryKind==='transactions'?{...incoming,recordedAt:new Date().toISOString()}:incoming,row={id:key,owner:space,kind:entryKind,body,fingerprint:isImport&&'fingerprint'in body?body.fingerprint||null:null};const result=isImport?await db.from('entries').upsert(row,{onConflict:'owner,fingerprint',ignoreDuplicates:true}).select('id'):await db.from('entries').insert(row).select('id');databaseError(result.error);saved+=result.data?.length||0;}
  }
  if(receiptId)databaseError((await db.from('receipts').update({tx_id:firstId}).eq('owner',space).eq('id',receiptId)).error);await audit(db,space,user.displayName,isImport?'Mengimpor mutasi bank':(parsed[0].id?'Mengubah ':'Menambah ')+entryKind);return reply({ok:true,id:firstId,saved,total:parsed.length});
}catch(e){if(e instanceof z.ZodError)return reply({error:e.issues[0]?.message||'Periksa isian.'},400);if(e instanceof SyntaxError)return reply({error:'Data tidak valid.'},400);return failure(e)}}
