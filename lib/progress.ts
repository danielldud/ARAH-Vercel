import {type Data,type Tx,delta,offset,today} from './finance';
export type Interval='day'|'week'|'year';
export type Window='7d'|'30d'|'90d'|'1y'|'ytd'|'all';
export const wibDay=(at:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
export function incomeStreak(transactions:Tx[],now=today()){
 const days=[...new Set(transactions.filter(t=>t.type==='income'&&t.recordedAt&&!isNaN(Date.parse(t.recordedAt))).map(t=>wibDay(t.recordedAt!)).filter(d=>d<=now))].sort();
 const active=new Set(days);let current=0,best=0,run=0,previous='';
 for(const day of days){run=previous&&offset(previous,1)===day?run+1:1;best=Math.max(best,run);previous=day;}
 let cursor=active.has(now)?now:offset(now,-1);while(active.has(cursor)){current++;cursor=offset(cursor,-1);}
 return {current,best,total:days.length,done:active.has(now),week:Array.from({length:7},(_,i)=>{const date=offset(now,i-6);return {date,active:active.has(date)}})};
}
export function chartRange(data:Data,window:Window,now=today()){
 const first=[data.settings.openingDate,...data.transactions.map(t=>t.date)].filter(d=>d<=now).sort()[0]||now;
 return {start:window==='all'?first:window==='ytd'?now.slice(0,4)+'-01-01':offset(now,window==='7d'?-6:window==='30d'?-29:window==='90d'?-89:-364),end:now};
}
function bucket(date:string,interval:Interval){if(interval==='year')return date.slice(0,4)+'-01-01';if(interval==='week'){const weekday=new Date(date+'T12:00:00Z').getUTCDay();return offset(date,-((weekday+6)%7));}return date;}
export function lineRows(data:Data,start:string,end:string,interval:Interval){
 if(start>end)return [];
 const grouped=new Map<string,{income:number;expense:number;movement:number}>();
 let balance=data.settings.openingBalance;
 for(const t of data.transactions){if(t.date<data.settings.openingDate){/* Historical flows remain visible without being counted twice in cash. */}else if(t.date<start)balance+=delta(t);
  if(t.date<start||t.date>end)continue;const key=bucket(t.date,interval),row=grouped.get(key)||{income:0,expense:0,movement:0};
  if(t.type==='income')row.income+=t.amount;if(t.type==='expense')row.expense+=t.amount;if(t.date>=data.settings.openingDate)row.movement+=delta(t);grouped.set(key,row);
 }
 const out=[];let key=bucket(start,interval);
 while(key<=end){const next=interval==='year'?String(Number(key.slice(0,4))+1).padStart(4,'0')+'-01-01':offset(key,interval==='week'?7:1);const from=key<start?start:key,to=offset(next,-1)>end?end:offset(next,-1),flow=grouped.get(key)||{income:0,expense:0,movement:0};balance+=flow.movement;
  out.push({date:from,end:to,label:interval==='year'?key.slice(0,4):new Date(from+'T12:00:00Z').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'2-digit'}),balance:to>=data.settings.openingDate?balance:null,income:flow.income,expense:flow.expense,surplus:flow.income-flow.expense});key=next;
 }
 return out;
}
