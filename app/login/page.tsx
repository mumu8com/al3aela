'use client'
import {useState} from 'react'
import {supabase} from '../../lib/supabase'
import {useRouter} from 'next/navigation'

export default function Login(){
  const r=useRouter()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [fullName,setFullName]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [signup,setSignup]=useState(false)
  const [loading,setLoading]=useState(false)

  async function go(){
    setError('')
    setMessage('')
    if(!email || !password || (signup && !fullName.trim())){
      setError(signup?'يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور':'يرجى إدخال البريد الإلكتروني وكلمة المرور')
      return
    }
    if(password.length < 6){
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setLoading(true)
    const res=signup
      ? await supabase.auth.signUp({email,password,options:{data:{full_name:fullName.trim()}}})
      : await supabase.auth.signInWithPassword({email,password})
    setLoading(false)
    if(res.error){
      setError(res.error.message)
      return
    }
    if(signup && !res.data.session){
      setMessage('تم إنشاء الحساب. إذا كان تأكيد البريد الإلكتروني مفعّلًا، افتح رسالة التأكيد ثم سجّل الدخول. بعد الدخول ستنتقل مباشرة لإنشاء العائلة.')
      return
    }
    r.push('/')
  }

  return <main className="auth">
    <div className="authbox">
      <div className="logo">👨‍👩‍👧‍👦</div>
      <h1>العائلة</h1>
      <p>شبكتكم العائلية الخاصة</p>
      {signup&&<input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="الاسم الكامل"/>}
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني"/>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور"/>
      <button className="primary" onClick={go} disabled={loading}>{loading?'جارٍ التنفيذ...':signup?'إنشاء الحساب':'تسجيل الدخول'}</button>
      {error&&<div className="error">{error}</div>}
      {message&&<div className="success">{message}</div>}
      <button className="link" onClick={()=>{setSignup(!signup);setError('');setMessage('')}}>{signup?'لديك حساب؟ تسجيل الدخول':'مستخدم جديد؟ إنشاء حساب'}</button>
    </div>
  </main>
}