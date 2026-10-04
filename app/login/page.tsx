'use client'
import {useState} from 'react'
import {supabase} from '../../lib/supabase'
import {useRouter} from 'next/navigation'

export default function Login(){
  const r=useRouter()
  const nextPath=()=>new URLSearchParams(window.location.search).get('next')||'/'
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[fullName,setFullName]=useState('')
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[signup,setSignup]=useState(false),[loading,setLoading]=useState(false)

  async function goEmail(){
    setError('');setMessage('')
    if(!email||!password||(signup&&!fullName.trim())){setError(signup?'يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور':'يرجى إدخال البريد الإلكتروني وكلمة المرور');return}
    if(password.length<6){setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');return}
    setLoading(true)
    const res=signup?await supabase.auth.signUp({email,password,options:{data:{full_name:fullName.trim()}}}):await supabase.auth.signInWithPassword({email,password})
    setLoading(false)
    if(res.error){setError(res.error.message);return}
    if(signup&&!res.data.session){setMessage('تم إنشاء الحساب. افتح رسالة تأكيد البريد الإلكتروني ثم سجّل الدخول.');return}
    r.push(nextPath())
  }

  async function google(){
    setError('');setMessage('');setLoading(true)
    const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+nextPath()}})
    if(error){setLoading(false);setError(error.message)}
  }

  return <main className="auth"><div className="authbox">
    <div className="logo">👨‍👩‍👧‍👦</div><h1>العائلة</h1><p>شبكتكم العائلية الخاصة</p>
    <button className="google-btn" onClick={google} disabled={loading}>🌐 المتابعة باستخدام Google</button>
    <div className="auth-divider"><span>أو</span></div>
    <button className="link auth-switch" onClick={()=>{setSignup(!signup);setError('');setMessage('')}}>{signup?'لديك حساب؟ تسجيل الدخول':'مستخدم جديد؟ إنشاء حساب'}</button>
    {signup&&<input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="الاسم الكامل"/>}
    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني" autoComplete="email"/>
    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور" autoComplete={signup?'new-password':'current-password'}/>
    <button className="primary" onClick={goEmail} disabled={loading}>{loading?'جارٍ التنفيذ...':signup?'إنشاء الحساب':'تسجيل الدخول'}</button>
    {error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}
  </div></main>
}