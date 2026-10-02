import type {Metadata,Viewport} from 'next';
import './globals.css';
import {AppearanceProvider} from './appearance';

export const metadata:Metadata={applicationName:'ARAH',title:'ARAH — Keuangan Pribadi',description:'Arus kas, proyek, agenda, dan perjalanan menuju target keuanganmu.',manifest:'/manifest.webmanifest',icons:{icon:[{url:'/favicon.svg',type:'image/svg+xml',sizes:'any'}],shortcut:'/favicon.svg'},openGraph:{title:'ARAH — Keuangan Pribadi',description:'Catat arus kas, proyek, agenda, dan perjalanan menuju target keuangan.',type:'website'},robots:{index:true,follow:true}};
export const viewport:Viewport={themeColor:'#2859e6'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id" suppressHydrationWarning><body><AppearanceProvider>{children}</AppearanceProvider></body></html>}
