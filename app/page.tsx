'use client'
import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'
import {useRouter} from 'next/navigation'

export default function Home(){
  const r=useRouter()
  const [session,setSession]=useState<any>(null),[name,setName]=useState(''),[family,setFamily]=useState<any>(null),[posts,setPosts]=useState<any[]>([]),[content,setContent]=useState(''),[busy,setBusy]=useState(false),[menu,setMenu]=useState(false)
  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(!data.session) r.replace('/login'); else {setSession(data.session);load(data.session.user.id)}})},[])
  async function load(uid:string){
    const {data:pf}=await supabase.from('profiles').select('full_name').eq('id',uid).maybeSingle(); setName(pf?.full_name||'')
    const {data:fm}=await supabase.from('family_members').select('family_id,role,families(id,name,description)').eq('user_id',uid)
    const f=(fm||[])[0]?.families; setFamily(f||null)
    if(f){const {data:p}=await supabase.from('posts').select('id,content,created_at,author_id').eq('family_id',(f as any).id).order('created_at',{ascending:false});setPosts(p||[])}
  }
  async function createFamily(){
    if(!name.trim())return; setBusy(true)
    const {data:{user}}=await supabase.auth.getUser(); if(!user){r.replace('/login');return}
    const {data:f,error}=await supabase.from('families').insert({name:name.trim(),created_by:user.id}).select().single()
    if(error){alert(error.message)} else if(f){const {error:e}=await supabase.from('family_members').insert({family_id:f.id,user_id:user.id,role:'admin'});if(e)alert(e.message);else setFamily(f)}
    setBusy(false)
  }
  async function post(){
    if(!content.trim()||!family||!session)return
    const {data:p,error}=await supabase.from('posts').insert({family_id:family.id,author_id:session.user.id,content:content.trim()}).select().single()
    if(error)alert(error.message); else if(p){setPosts([p,...posts]);setContent('')}
  }
  async function logout(){await supabase.auth.signOut();r.replace('/login')}
  if(!session)return null
  const initial=(name||'ع').slice(0,1)
  return <main className="fbapp">
    <header className="topbar">
      <button className="brand" onClick={()=>r.push('/')}>العائلة <span>al3aela</span></button>
      <div className="topsearch">🔎 <input placeholder="بحث في العائلة"/></div>
      <nav className="topnav"><button onClick={()=>r.push('/')}>⌂<span>الرئيسية</span></button><button onClick={()=>r.push('/tree')}>🌳<span>الشجرة</span></button><button onClick={()=>r.push('/profile')}>👤<span>ملفي</span></button><button onClick={()=>setMenu(!menu)}>☰</button></nav>
      {menu&&<div className="dropdown"><button onClick={()=>r.push('/profile')}>الملف الشخصي</button><button onClick={logout}>تسجيل الخروج</button></div>}
    </header>
    <div className="fb-layout">
      <aside className="sidebar">
        <button className="profile-link" onClick={()=>r.push('/profile')}><span className="avatar">{initial}</span><b>{name||'حسابي'}</b></button>
        <button onClick={()=>r.push('/')}>🏠 <span>الرئيسية</span></button>
        <button onClick={()=>r.push('/tree')}>🌳 <span>شجرة العائلة</span></button>
        <button onClick={()=>r.push('/profile')}>👤 <span>الملف الشخصي</span></button>
        {family&&<div className="side-family"><small>العائلة</small><strong>👨‍👩‍👧‍👦 {family.name}</strong></div>}
      </aside>
      <section className="feed">
        <div className="welcome card"><div className="cover"></div><div className="welcome-body"><div className="avatar large">{initial}</div><div><h1>أهلاً {name||'بك'} 👋</h1><p>شارك أخبارك وذكرياتك مع أفراد عائلتك.</p></div></div></div>
        {!family?<div className="card create-family"><h2>أنشئ عائلتك</h2><p>ابدأ مساحة العائلة ثم أضف أفراد الأسرة وشارك المنشورات.</p><input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم العائلة"/><button className="primary" disabled={busy} onClick={createFamily}>{busy?'جارٍ الإنشاء...':'إنشاء العائلة'}</button></div>:
        <>
          <div className="card composer"><div className="composer-row"><div className="avatar">{initial}</div><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="ماذا تريد أن تشارك مع عائلتك؟"/></div><div className="composer-actions"><span>📷 صورة</span><span>🎥 فيديو</span><span>😊 شعور</span><button className="primary" onClick={post}>نشر</button></div></div>
          {posts.length===0&&<div className="card empty"><div>📝</div><h3>لا توجد منشورات بعد</h3><p>كن أول فرد في العائلة ينشر شيئاً.</p></div>}
          {posts.map(p=><article className="card post" key={p.id}><div className="post-head"><div className="avatar">{initial}</div><div><b>{name||'أحد أفراد العائلة'}</b><small>{new Date(p.created_at).toLocaleString('ar-LY')}</small></div><button className="dots">•••</button></div><p className="post-text">{p.content}</p><div className="post-meta"><span>♡ أعجبني</span><span>💬 تعليق</span><span>↗ مشاركة</span></div></article>)}
        </>}
      </section>
      <aside className="rightbar"><div className="card"><h3>اختصارات العائلة</h3><button onClick={()=>r.push('/tree')}>🌳 شجرة العائلة <small>الأفراد والروابط</small></button><button onClick={()=>r.push('/profile')}>👤 ملفي الشخصي <small>تعديل بياناتك</small></button></div><div className="card tips"><h3>مساحتكم العائلية</h3><p>هذه شبكة خاصة بعائلتك. أضف الأفراد وابدأ مشاركة الذكريات.</p></div></aside>
    </div>
  </main>
}