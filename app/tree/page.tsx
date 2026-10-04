'use client'
import {useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import {useRouter} from 'next/navigation'
export default function Tree(){
 const r=useRouter();const [family,setFamily]=useState<any>();const [people,setPeople]=useState<any[]>([]);const [fullName,setFullName]=useState('');const [loading,setLoading]=useState(true)
 useEffect(()=>{load()},[])
 async function load(){const {data:{user}}=await supabase.auth.getUser();if(!user){r.replace('/login');return}
  const {data:m,error:memberError}=await supabase.from('family_members').select('family_id,role').eq('user_id',user.id).order('joined_at',{ascending:true}).limit(1).maybeSingle()
  if(memberError){console.error(memberError);setLoading(false);return}
  if(m?.family_id){
    const {data:f}=await supabase.from('families').select('id,name,description,created_by').eq('id',m.family_id).maybeSingle()
    if(f){setFamily(f);const {data:p}=await supabase.from('family_people').select('*').eq('family_id',f.id).order('created_at');setPeople(p||[])}
  }
  setLoading(false)}
 async function add(){if(!fullName.trim()||!family)return;const normalized=fullName.normalize('NFC').replace(/\s+/gu,' ').trim();if(!normalized)return;const {data:p,error}=await supabase.from('family_people').insert({family_id:family.id,full_name:normalized}).select().single();if(error){alert('تعذر إضافة فرد العائلة: '+error.message);return}if(p){setPeople(prev=>[...prev,p]);setFullName('')}}
 return <main className="fbapp"><header className="topbar"><button className="brand" onClick={()=>r.push('/')}>العائلة <span>al3aela</span></button><div className="topsearch">🔎 <input placeholder="بحث في العائلة"/></div><nav className="topnav"><button onClick={()=>r.push('/')}>⌂<span>الرئيسية</span></button><button className="active">🌳<span>الشجرة</span></button><button onClick={()=>r.push('/profile')}>👤<span>ملفي</span></button></nav></header>
 <div className="tree-page"><section className="card tree-head"><div><small>عائلتي</small><h1>🌳 {family?.name||'شجرة العائلة'}</h1><p>رتّب أفراد الأسرة وابنِ شجرتكم العائلية.</p></div></section>
 <section className="card"><div className="section-title"><h2>أفراد العائلة</h2><span>{people.length} أفراد</span></div>{loading?<p>جارٍ التحميل...</p>:<div className="people-grid">{people.length?people.map(p=><div className="person-card" key={p.id}><div className="avatar large">{(p.full_name||'ع').slice(0,1)}</div><div><b>{p.full_name}</b><small>عضو في العائلة</small></div></div>):<div className="empty"><div>👨‍👩‍👧‍👦</div><h3>ابدأ بإضافة أفراد عائلتك</h3><p>أضف أسماء أفراد الأسرة لبناء الشجرة.</p></div>}</div>}<div className="addrow"><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="اسم فرد من العائلة"/><button className="primary" onClick={add}>+ إضافة فرد</button></div></section></div></main>
}