'use client'
import {useEffect,useState} from 'react'
import {useParams,useRouter} from 'next/navigation'
import {supabase} from '../../../lib/supabase'

export default function JoinFamily(){
 const r=useRouter();const params=useParams<{code:string}>();const [status,setStatus]=useState('جارٍ التحقق من الدعوة...')
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){r.replace('/login?next='+encodeURIComponent('/join/'+params.code));return}const {data,error}=await supabase.rpc('redeem_family_invite',{p_code:params.code});if(error){setStatus(error.message);return}setStatus('تم انضمامك إلى العائلة بنجاح.');setTimeout(()=>r.replace('/'),600)})()},[params.code])
 return <main className="auth"><div className="authbox"><div className="logo">👨‍👩‍👧‍👦</div><h1>العائلة</h1><p>{status}</p></div></main>
}