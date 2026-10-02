import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'ARAH — Keuangan Pribadi',short_name:'ARAH',description:'Arus kas, proyek, agenda, dan perjalanan menuju target keuanganmu.',start_url:'/',display:'standalone',background_color:'#f5f7fb',theme_color:'#2859e6',icons:[{src:'/favicon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]}}
