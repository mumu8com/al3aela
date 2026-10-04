'use client'
import {useState} from 'react'
import {supabase} from '../../lib/supabase'
import {useRouter,useSearchParams} from 'next/navigation'

export default function Login(){
  const r=useRouter()
  const params=useSearchParams()
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[fullName,setFullName]=useState('')
  const [phone,setPhone]=useState(''),[otp,setOtp]=useState(''),[mode,setMode]=useState<'email'|'phone'>('email')
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[signup,setSignup]=useState(false),[otpSent,setOtpSent]=useState(false),[loading,setLoading]=useState(false)

  async function goEmail(){
    setError('');setMessage('')
    if(!email||!password||(signup&&!fullName.trim())){setError(signup?'يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور':'يرجى إدخال البريد الإلكتروني وكلمة المرور');return}
    if(password.length<6){setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');return}
    setLoading(true)
    const res=signup?await supabase.auth.signUp({email,password,options:{data:{full_name:fullName.trim()}}}):await supabase.auth.signInWithPassword({email,password})
    setLoading(false)
    if(res.error){setError(res.error.message);return}
    if(signup&&!res.data.session){setMessage('تم إنشاء الحساب. افتح رسالة تأكيد البريد الإلكتروني ثم سجّل الدخول.');return}
    r.push(params.get('next')||'/')
  }

  async function sendPhoneOtp(){
    setError('');setMessage('')
    const normalized=phone.trim()
    if(!/^\+?[1-9]\d{7,14}$/.test(normalized)){setError('أدخل رقم الهاتف بصيغة دولية، مثل +2189xxxxxxxx');return}
    setLoading(true)
    const {error}=await supabase.auth.signInWithOtp({phone:normalized,options:{shouldCreateUser:true}})
    setLoading(false)
    if(error){setError(error.message);return}
    setOtpSent(true);setMessage('تم إرسال رمز التحقق إلى هاتفك.')
  }

  async function verifyPhoneOtp(){
    setError('');setMessage('')
    if(!/^\d{6}$/.test(otp.trim())){setError('أدخل رمز التحقق المكوّن من 6 أرقام');return}
    setLoading(true)
    const {error}=await supabase.auth.verifyOtp({phone:phone.trim(),token:otp.trim(),type:'sms'})
    setLoading(false)
    if(error){setError(error.message);return}
    r.push(params.get('next')||'/')
  }

  async function google(){
    setError('');setMessage('');setLoading(true)
    const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+(params.get('next')||'/')}})
    if(error){setLoading(false);setError(error.message)}
  }

  return <main className="auth"><div className="authbox">
    <div className="logo">👨‍👩‍👧‍👦</div><h1>العائلة</h1><p>شبكتكم العائلية الخاصة</p>
    <button className="google-btn" onClick={google} disabled={loading}>🌐 المتابعة باستخدام Google</button>
    <div className="auth-divider"><span>أو</span></div>
    <div className="auth-tabs"><button className={mode==='email'?'active':''} onClick={()=>{setMode('email');setError('');setMessage('')}}>البريد الإلكتروني</button><button className={mode==='phone'?'active':''} onClick={()=>{setMode('phone');setError('');setMessage('')}}>الهاتف</button></div>
    {mode==='email'?<><button className="link auth-switch" onClick={()=>{setSignup(!signup);setError('');setMessage('')}}>{signup?'لديك حساب؟ تسجيل الدخول':'مستخدم جديد؟ إنشاء حساب'}</button>{signup&&<input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="الاسم الكامل"/>}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني" autoComplete="email"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور" autoComplete={signup?'new-password':'current-password'}/><button className="primary" onClick={goEmail} disabled={loading}>{loading?'جارٍ التنفيذ...':signup?'إنشاء الحساب':'تسجيل الدخول'}</button></>:<>{!otpSent?<><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+2189xxxxxxxx" autoComplete="tel" dir="ltr"/><button className="primary" onClick={sendPhoneOtp} disabled={loading}>{loading?'جارٍ الإرسال...':'إرسال رمز SMS'}</button></>:<><input type="tel" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="رمز التحقق من 6 أرقام" inputMode="numeric" autoComplete="one-time-code" dir="ltr"/><button className="primary" onClick={verifyPhoneOtp} disabled={loading}>{loading?'جارٍ التحقق...':'تأكيد الرمز والدخول'}</button><button className="link" onClick={()=>{setOtpSent(false);setOtp('')}}>تغيير رقم الهاتف</button></>}</>}
    {error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}
  </div></main>
}