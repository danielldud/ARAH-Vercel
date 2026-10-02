'use client';

import {AppearanceControl} from './appearance';
import {createContext,useContext,useEffect,useState,type FormEvent,type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {supabase} from '@/lib/supabase-browser';
import {Button} from '@/components/ui/button';

type AuthValue={user:User;signOut:()=>Promise<void>};
const AuthContext=createContext<AuthValue|null>(null);
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('Auth context unavailable');return value}

export default function AuthGate({children}:{children:ReactNode}){
  const [user,setUser]=useState<User|null|undefined>(undefined),[recovery,setRecovery]=useState(false),[configError,setConfigError]=useState('');
  useEffect(()=>{try{const auth=supabase().auth;auth.getSession().then(({data})=>setUser(data.session?.user||null));const {data}=auth.onAuthStateChange((event,session)=>{setUser(session?.user||null);if(event==='PASSWORD_RECOVERY')setRecovery(true)});return()=>data.subscription.unsubscribe()}catch(e){setConfigError((e as Error).message);setUser(null)}},[]);
  if(configError)return <AuthMessage title="Konfigurasi Supabase belum lengkap" text={configError}/>;
  if(user===undefined)return <AuthMessage title="arah." text="Memeriksa sesi akunmu…"/>;
  if(recovery&&user)return <PasswordRecovery done={()=>setRecovery(false)}/>;
  if(!user)return <AuthScreen/>;
  return <AuthContext.Provider value={{user,signOut:async()=>{await supabase().auth.signOut()}}}>{children}</AuthContext.Provider>;
}

function AuthMessage({title,text}:{title:string;text:string}){return <main className="auth-page"><section className="auth-card"><div className="auth-card-header"><div className="auth-brand">arah.</div><AppearanceControl/></div><h1>{title}</h1><p>{text}</p></section></main>}

function AuthScreen(){
  const [mode,setMode]=useState<'login'|'signup'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{if(mode==='signup'){const {data,error}=await supabase().auth.signUp({email,password,options:{data:{name:name.trim()}}});if(error)throw error;if(!data.session)setMessage('Akun dibuat. Periksa email untuk verifikasi, lalu kembali dan masuk.')}else{const {error}=await supabase().auth.signInWithPassword({email,password});if(error)throw error}}catch(e){setError(human((e as Error).message))}finally{setBusy(false)}}
  async function reset(){if(!email)return setError('Isi email terlebih dahulu.');setBusy(true);setError('');try{const {error}=await supabase().auth.resetPasswordForEmail(email,{redirectTo:location.origin});if(error)throw error;setMessage('Tautan reset password sudah dikirim ke emailmu.')}catch(e){setError(human((e as Error).message))}finally{setBusy(false)}}
  return <main className="auth-page"><section className="auth-card"><div className="auth-card-header"><div className="auth-brand">arah.</div><AppearanceControl/></div><span className="eyebrow">KEUANGANMU, AKUNMU</span><h1>{mode==='login'?'Masuk ke ARAH':'Buat akun ARAH'}</h1><p>{mode==='login'?'Lanjutkan mencatat arus kas dan progres tujuanmu.':'Setiap akun mendapat ruang keuangan pribadi yang terpisah.'}</p><div className="auth-switch"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('');setMessage('')}}>Masuk</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');setMessage('')}}>Daftar</button></div><form onSubmit={submit}>{mode==='signup'&&<label>Nama<input required maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Nama yang ditampilkan"/></label>}<label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></label><label>Password<input required type="password" minLength={8} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter"/></label>{error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-success" role="status">{message}</p>}<Button disabled={busy} type="submit">{busy?'Memproses…':mode==='login'?'Masuk':'Buat akun'}</Button></form>{mode==='login'&&<button className="auth-forgot" disabled={busy} onClick={reset}>Lupa password?</button>}<small>Dengan masuk, data keuanganmu hanya dibuka untuk akun dan ruang yang memiliki izin.</small></section></main>
}

function PasswordRecovery({done}:{done:()=>void}){const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');return <main className="auth-page"><section className="auth-card"><div className="auth-card-header"><div className="auth-brand">arah.</div><AppearanceControl/></div><h1>Buat password baru</h1><p>Gunakan minimal 8 karakter yang tidak mudah ditebak.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);const {error}=await supabase().auth.updateUser({password});setBusy(false);if(error)setError(human(error.message));else done()}}><label>Password baru<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="auth-error">{error}</p>}<Button disabled={busy}>{busy?'Menyimpan…':'Simpan password'}</Button></form></section></main>}

function human(message:string){const m=message.toLowerCase();if(m.includes('invalid login'))return 'Email atau password salah.';if(m.includes('already registered'))return 'Email ini sudah terdaftar.';if(m.includes('password'))return 'Password belum memenuhi ketentuan.';if(m.includes('email not confirmed'))return 'Verifikasi emailmu sebelum masuk.';return message}
