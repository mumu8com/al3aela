'use client'
import {useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import {useRouter} from 'next/navigation'

export default function Tree(){
 const r=useRouter();const [inviteCode,setInviteCode]=useState('');const [inviteInput,setInviteInput]=useState('');const [inviteBusy,setInviteBusy]=useState(false);const [family,setFamily]=useState<any>(null);const [people,setPeople]=useState<any[]>([]);const [fullName,setFullName]=useState('');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('')

 useEffect(()=>{load()},[])

 async function load(){
  setLoading(true);setError('')
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){r.replace('/login');return}
  const {data:m,error:memberError}=await supabase.from('family_members').select('family_id,role').eq('user_id',user.id).order('joined_at',{ascending:true}).limit(1).maybeSingle()
  if(memberError){console.error(memberError);setError('تعذر تحميل عضويتك في العائلة.');setLoading(false);return}
  if(!m?.family_id){setError('لم تنضم إلى عائلة بعد. أنشئ عائلتك من الصفحة الرئيسية أولاً.');setLoading(false);return}
  const {data:f,error:familyError}=await supabase.from('families').select('id,name,description,created_by').eq('id',m.family_id).maybeSingle()
  if(familyError||!f){setError('تعذر تحميل بيانات العائلة.');setLoading(false);return}
  setFamily(f)
  const {data:p,error:peopleError}=await supabase.from('family_people').select('*').eq('family_id',f.id).order('created_at')
  if(peopleError){console.error(peopleError);setError('تعذر تحميل أفراد العائلة.');setPeople([])}else setPeople(p||[])
  setLoading(false)
 }

 async function createInvite(){
  if(!family||inviteBusy)return;setInviteBusy(true);setError('')
  try{const {data,error}=await supabase.from('family_invite_links').insert({family_id:family.id,created_by:(await supabase.auth.getUser()).data.user?.id}).select('code').single();if(error){setError('تعذر إنشاء رابط الدعوة: '+error.message);return}setInviteCode(data.code);await navigator.clipboard?.writeText(window.location.origin+'/join/'+data.code)}finally{setInviteBusy(false)}
 }
 async function redeemInvite(){
  const code=inviteInput.trim();if(!code)return;setInviteBusy(true);setError('')
  try{const {data,error}=await supabase.rpc('redeem_family_invite',{p_code:code});if(error){setError(error.message);return}setInviteInput('');setFamily(data);await load()}finally{setInviteBusy(false)}
 }

 async function add(){
  if(!fullName.trim()||!family||saving)return
  const normalized=fullName.normalize('NFC').replace(/\s+/gu,' ').trim()
  if(normalized.length<2){setError('اكتب اسم فرد العائلة بشكل صحيح.');return}
  if(normalized.length>120){setError('اسم الفرد طويل جداً.');return}
  setError('');setSaving(true)
  try{
   const {data:p,error}=await supabase.from('family_people').insert({family_id:family.id,full_name:normalized}).select().single()
   if(error){console.error(error);setError('تعذر إضافة فرد العائلة: '+error.message);return}
   if(p){setPeople(prev=>[...prev,p]);setFullName('')}
  }finally{setSaving(false)}
 }

 return <main className="fbapp"><header className="topbar"><button className="brand" onClick={()=>r.push('/')}>العائلة <span>al3aela</span></button><div className="topsearch">🔎 <input placeholder="بحث في العائلة"/></div><nav className="topnav"><button onClick={()=>r.push('/')}>⌂<span>الرئيسية</span></button><button className="active">🌳<span>الشجرة</span></button><button onClick={()=>r.push('/profile')}>👤<span>ملفي</span></button></nav></header>
 <div className="tree-page"><section className="card tree-head"><div><small>عائلتي</small><h1>🌳 {family?.name||'شجرة العائلة'}</h1><p>رتّب أفراد الأسرة وابنِ شجرتكم العائلية.</p></div></section>
 <section className="card"><div className="section-title"><h2>أفراد العائلة</h2><span>{people.length} أفراد</span></div>
 {loading?<p>جارٍ التحميل...</p>:error?<div className="family-form-message error" role="alert">{error}</div>:<div className="people-grid">{people.length?people.map(p=><div className="person-card" key={p.id}><div className="avatar large">{(p.full_name||'ع').slice(0,1)}</div><div><b>{p.full_name}</b><small>عضو في العائلة</small></div></div>):<div className="empty"><div>👨‍👩‍👧‍👦</div><h3>ابدأ بإضافة أفراد عائلتك</h3><p>أضف أسماء أفراد الأسرة لبناء الشجرة.</p></div>}</div>}
 {family&&<div className="addrow"><input value={fullName} onChange={e=>{setFullName(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}} placeholder="اسم فرد من العائلة" aria-label="اسم فرد من العائلة" maxLength={120}/><button className="primary" disabled={saving||!fullName.trim()} onClick={add}>{saving?'جارٍ الإضافة...':'+ إضافة فرد'}</button></div>}
 </section><section className="card"><div className="section-title"><h2>دعوة أفراد العائلة</h2><span>مشاركة آمنة</span></div>{family?.created_by===undefined||family?.created_by===(null)?null:<p>أنشئ رابط دعوة وشاركه مع أفراد عائلتك للانضمام.</p>}<div className="addrow"><button className="primary" disabled={inviteBusy} onClick={createInvite}>{inviteBusy?'جارٍ الإنشاء...':'🔗 إنشاء رابط دعوة'}</button>{inviteCode&&<input readOnly value={window.location.origin+'/join/'+inviteCode} onFocus={e=>e.currentTarget.select()}/>}</div></section><section className="card"><div className="section-title"><h2>الانضمام برمز دعوة</h2></div><div className="addrow"><input value={inviteInput} onChange={e=>setInviteInput(e.target.value)} placeholder="الصق رمز الدعوة هنا"/><button className="primary" disabled={inviteBusy||!inviteInput.trim()} onClick={redeemInvite}>انضمام</button></div></section></div></main>
}
