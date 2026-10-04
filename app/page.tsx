'use client'
import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../lib/supabase'
import {useRouter} from 'next/navigation'

type Post={id:string;content:string;created_at:string;author_id:string;author_name?:string;likes:number;liked:boolean;comments:any[];commentText:string;media:any[];post_type?:string;mood?:string}
type Notice={id:string;message:string;type:string;read_at:string|null;created_at:string}

export default function Home(){
  const r=useRouter()
  const [session,setSession]=useState<any>(null),[name,setName]=useState(''),[family,setFamily]=useState<any>(null)
  const [posts,setPosts]=useState<Post[]>([]),[content,setContent]=useState(''),[familyName,setFamilyName]=useState('')
  const [busy,setBusy]=useState(false),[menu,setMenu]=useState(false),[search,setSearch]=useState(''),[composer,setComposer]=useState(false),[storyOpen,setStoryOpen]=useState(false),[storyText,setStoryText]=useState(''),[mood,setMood]=useState(''),[stories,setStories]=useState<any[]>([]),[commentOpen,setCommentOpen]=useState<string|null>(null),[mediaFiles,setMediaFiles]=useState<File[]>([]),[viewStory,setViewStory]=useState<any|null>(null)
  const [notifications,setNotifications]=useState<Notice[]>([]),[showNotifications,setShowNotifications]=useState(false)
  const [familyError,setFamilyError]=useState('')
  const [familySuccess,setFamilySuccess]=useState('')

  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(!data.session) r.replace('/login'); else {setSession(data.session);load(data.session.user.id)}})},[])

  async function load(uid:string){
    const {data:pf}=await supabase.from('profiles').select('full_name').eq('id',uid).maybeSingle()
    setName(pf?.full_name||'')
    const {data:fm}=await supabase.from('family_members').select('family_id,role,families(id,name,description)').eq('user_id',uid)
    const rawFamily=(fm||[])[0]?.families
    const f=Array.isArray(rawFamily)?rawFamily[0]:rawFamily
    setFamily(f||null)
    const {data:n}=await supabase.from('notifications').select('id,message,type,read_at,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(20)
    setNotifications(n||[])
    if(f){await loadPosts(f.id,uid);const {data:s}=await supabase.from('stories').select('id,content,author_id,mood,created_at').eq('family_id',f.id).order('created_at',{ascending:false}).limit(20);setStories(s||[])}
  }

  async function loadPosts(familyId:string,uid:string){
    const {data:p}=await supabase.from('posts').select('id,content,created_at,author_id,post_type,mood').eq('family_id',familyId).order('created_at',{ascending:false}).limit(50)
    const postsRaw=p||[]
    const ids=postsRaw.map(x=>x.id), authors=[...new Set(postsRaw.map(x=>x.author_id))]
    const [{data:profiles},{data:likes},{data:comments},{data:media}]=await Promise.all([
      authors.length?supabase.from('profiles').select('id,full_name').in('id',authors):Promise.resolve({data:[] as any[]}),
      ids.length?supabase.from('post_likes').select('post_id,user_id').in('post_id',ids):Promise.resolve({data:[] as any[]}),
      ids.length?supabase.from('comments').select('id,post_id,author_id,content,created_at').in('post_id',ids).order('created_at',{ascending:true}):Promise.resolve({data:[] as any[]}),
      ids.length?supabase.from('post_media').select('id,post_id,media_url,media_type').in('post_id',ids):Promise.resolve({data:[] as any[]})
    ])
    const authorMap=new Map((profiles||[]).map((x:any)=>[x.id,x.full_name]))
    const commentAuthors=[...new Set((comments||[]).map((x:any)=>x.author_id))]
    let cp:any[]=[]
    if(commentAuthors.length){const {data}=await supabase.from('profiles').select('id,full_name').in('id',commentAuthors);cp=data||[]}
    const commentMap=new Map(cp.map(x=>[x.id,x.full_name]))
    setPosts(postsRaw.map((x:any)=>({...x,author_name:authorMap.get(x.author_id)||'أحد أفراد العائلة',likes:(likes||[]).filter((l:any)=>l.post_id===x.id).length,liked:(likes||[]).some((l:any)=>l.post_id===x.id&&l.user_id===uid),comments:(comments||[]).filter((c:any)=>c.post_id===x.id).map((c:any)=>({...c,author_name:commentMap.get(c.author_id)||'عضو العائلة'})),commentText:'',media:(media||[]).filter((m:any)=>m.post_id===x.id)})))
  }

  async function createFamily(){
    if(!session)return
    setFamilyError('');setFamilySuccess('')
    const normalizedFamilyName=familyName.normalize('NFC').replace(/\s+/gu,' ').trim()
    if(!normalizedFamilyName){setFamilyError('يرجى كتابة اسم العائلة أولاً.');return}
    if(normalizedFamilyName.length<2){setFamilyError('اسم العائلة قصير جداً. اكتب اسماً مكوناً من حرفين على الأقل.');return}
    if(normalizedFamilyName.length>80){setFamilyError('اسم العائلة طويل جداً. الحد الأقصى 80 حرفاً.');return}
    setBusy(true)
    const {data:f,error}=await supabase.from('families').insert({name:normalizedFamilyName,created_by:session.user.id}).select().single()
    if(error){setFamilyError('تعذر إنشاء العائلة حالياً. تأكد من الاتصال وحاول مرة أخرى.');setBusy(false);return}
    if(f){
      const {error:e}=await supabase.from('family_members').insert({family_id:f.id,user_id:session.user.id,role:'admin'})
      if(e){setFamilyError('تم إنشاء العائلة، لكن تعذر ربط حسابك بها. حاول مرة أخرى.');setBusy(false);return}
      setFamilyName(normalizedFamilyName);setFamily(f);setFamilySuccess('تم إنشاء العائلة بنجاح.');await loadPosts(f.id,session.user.id)
    }
    setBusy(false)
  }

  async function publishStory(){if(!storyText.trim()||!family||!session)return;setBusy(true);const {error}=await supabase.from('stories').insert({family_id:family.id,author_id:session.user.id,content:storyText.trim(),mood:mood||null});if(error)alert(error.message);else{setStoryText('');setMood('');setStoryOpen(false);const {data:s}=await supabase.from('stories').select('id,content,author_id,mood,created_at').eq('family_id',family.id).order('created_at',{ascending:false}).limit(20);setStories(s||[])}setBusy(false)}
  async function publishPost(){if(!content.trim()||!family||!session)return;setBusy(true);const {data:p,error}=await supabase.from('posts').insert({family_id:family.id,author_id:session.user.id,content:content.trim(),post_type:mood?'feeling':'post',mood:mood||null}).select().single();if(error){alert(error.message);setBusy(false);return}if(p&&mediaFiles.length){for(const file of mediaFiles){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=session.user.id+'/'+crypto.randomUUID()+'-'+safe;const up=await supabase.storage.from('al3aela-media').upload(path,file,{contentType:file.type,upsert:false});if(up.error){alert('تعذر رفع '+file.name+': '+up.error.message);continue}const publicUrl=supabase.storage.from('al3aela-media').getPublicUrl(path).data.publicUrl;const mediaType=file.type.startsWith('video/')?'video':'image';await supabase.from('post_media').insert({post_id:p.id,media_url:publicUrl,media_type:mediaType})}}setContent('');setMood('');setMediaFiles([]);setComposer(false);await loadPosts(family.id,session.user.id);setBusy(false)}
  async function post(){if(!content.trim()||!family||!session)return;const {data:p,error}=await supabase.from('posts').insert({family_id:family.id,author_id:session.user.id,content:content.trim()}).select().single();if(error)alert(error.message);else if(p){setContent('');await loadPosts(family.id,session.user.id)}}
  async function toggleLike(p:Post){if(!session)return;if(p.liked)await supabase.from('post_likes').delete().eq('post_id',p.id).eq('user_id',session.user.id);else{const {error}=await supabase.from('post_likes').insert({post_id:p.id,user_id:session.user.id});if(error){alert(error.message);return}}setPosts(prev=>prev.map(x=>x.id===p.id?{...x,liked:!x.liked,likes:Math.max(0,x.likes+(x.liked?-1:1))}:x))}
  async function addComment(p:Post){if(!session||!p.commentText.trim())return;const {data,error}=await supabase.from('comments').insert({post_id:p.id,author_id:session.user.id,content:p.commentText.trim()}).select().single();if(error){alert(error.message);return}setPosts(prev=>prev.map(x=>x.id===p.id?{...x,commentText:'',comments:[...x.comments,{...data,author_name:name||'عضو العائلة'}]}:x))}
  async function share(p:Post){try{await navigator.clipboard.writeText(p.content);alert('تم نسخ المنشور لمشاركته')}catch{alert('تعذر نسخ المنشور')}}
  async function markRead(n:Notice){if(n.read_at)return;await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id);setNotifications(x=>x.map(y=>y.id===n.id?{...y,read_at:new Date().toISOString()}:y))}
  async function logout(){await supabase.auth.signOut();r.replace('/login')}
  const initial=(name||'ع').slice(0,1),filtered=useMemo(()=>posts.filter(p=>(p.content+' '+p.author_name).toLowerCase().includes(search.toLowerCase())),[posts,search]),unread=notifications.filter(n=>!n.read_at).length
  if(!session)return null
  return <main className="fbapp" dir="rtl" lang="ar">
    <header className="topbar"><button className="brand" onClick={()=>r.push('/')}>العائلة <span>al3aela</span></button><div className="topsearch">🔎 <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث في العائلة"/></div><nav className="topnav"><button onClick={()=>r.push('/')}>⌂<span>الرئيسية</span></button><button onClick={()=>r.push('/tree')}>🌳<span>الشجرة</span></button><button onClick={()=>r.push('/profile')}>👤<span>ملفي</span></button><button className="notify-btn" onClick={()=>setShowNotifications(!showNotifications)}>🔔{unread>0&&<b>{unread}</b>}</button><button onClick={()=>setMenu(!menu)}>☰</button></nav>{showNotifications&&<div className="notifications"><h3>الإشعارات</h3>{notifications.length?notifications.map(n=><button className={n.read_at?'read':''} key={n.id} onClick={()=>markRead(n)}><span>{n.type==='like'?'👍':'💬'}</span><div><b>{n.message}</b><small>{new Date(n.created_at).toLocaleString('ar-LY')}</small></div></button>):<p>لا توجد إشعارات</p>}</div>}{menu&&<div className="dropdown"><button onClick={()=>r.push('/profile')}>الملف الشخصي</button><button onClick={logout}>تسجيل الخروج</button></div>}</header>
    <div className="fb-layout"><aside className="sidebar"><button className="profile-link" onClick={()=>r.push('/profile')}><span className="avatar">{initial}</span><b>{name||'حسابي'}</b></button><button onClick={()=>r.push('/')}>🏠 <span>الرئيسية</span></button><button onClick={()=>r.push('/tree')}>🌳 <span>شجرة العائلة</span></button><button onClick={()=>r.push('/profile')}>👤 <span>الملف الشخصي</span></button>{family&&<div className="side-family"><small>العائلة</small><strong>👨‍👩‍👧‍👦 {family.name}</strong></div>}</aside>
      <section className="feed"><div className="welcome card"><div className="cover"></div><div className="welcome-body"><div className="avatar large">{initial}</div><div><h1>أهلاً {name||'بك'} 👋</h1><p>شارك أخبارك وذكرياتك مع أفراد عائلتك.</p></div></div></div>
        {!family?<div className="card create-family"><h2>أنشئ عائلتك</h2><p>ابدأ مساحة العائلة ثم أضف أفراد الأسرة وشارك المنشورات.</p><input value={familyName} onChange={e=>{setFamilyName(e.target.value);setFamilyError('');setFamilySuccess('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();createFamily()}}} placeholder="اكتب اسم العائلة بالعربية أو أي لغة" aria-label="اسم العائلة" lang="ar" dir="rtl" inputMode="text" autoComplete="organization" maxLength={80}/><small className="family-input-hint">يمكنك استخدام العربية بالكامل، مثل: عائلة السنوسي</small>{familyError&&<div className="family-form-message error" role="alert">{familyError}</div>}{familySuccess&&<div className="family-form-message success" role="status">{familySuccess}</div>}<button className="primary" disabled={busy||!familyName.trim()} onClick={createFamily}>{busy?'جارٍ إنشاء العائلة...':'إنشاء العائلة'}</button></div>:
        <><div className="card quick-composer"><div className="composer-row"><div className="avatar">{initial}</div><button className="composer-trigger" onClick={()=>setComposer(true)}>ما الذي تريد مشاركته يا {name||'عزيزي'}؟</button></div><div className="quick-actions"><button onClick={()=>setComposer(true)}>📷 <b>منشور</b></button><button onClick={()=>setComposer(true)}>😊 <b>شعور / نشاط</b></button><button onClick={()=>setStoryOpen(true)}>⭕ <b>حالتي</b></button></div></div>
{composer&&<div className="card composer-modal"><div className="modal-head"><h2>إنشاء منشور</h2><button onClick={()=>setComposer(false)}>✕</button></div><div className="composer-user"><div className="avatar">{initial}</div><b>{name||'أنت'}</b></div><textarea autoFocus value={content} onChange={e=>setContent(e.target.value)} placeholder="ماذا يحدث في عائلتك؟"/><div className="media-picker"><label>📷 صورة / 🎥 فيديو <input type="file" accept="image/*,video/*" multiple onChange={e=>setMediaFiles(Array.from(e.target.files||[]))}/></label>{mediaFiles.length>0&&<small>{mediaFiles.length} ملف محدد</small>}</div><div className="mood-row">{['😊 سعيد','❤️ ممتن','🎉 متحمس','😢 حزين','💪 قوي'].map(x=><button key={x} onClick={()=>setMood(x)}>{x}</button>)}</div><div className="publish-row"><span>العائلة فقط 🔒</span><button className="primary" disabled={busy||!content.trim()} onClick={publishPost}>{busy?'جارٍ النشر...':'نشر المنشور'}</button></div></div>}
{storyOpen&&<div className="card composer-modal"><div className="modal-head"><h2>إضافة حالتي</h2><button onClick={()=>setStoryOpen(false)}>✕</button></div><div className="story-preview"><div className="story-avatar big">{initial}</div><b>{name||'أنت'}</b><small>تختفي بعد 24 ساعة</small></div><textarea autoFocus value={storyText} onChange={e=>setStoryText(e.target.value)} placeholder="اكتب حالتك الآن..."/><div className="mood-row">{['😊 سعيد','❤️ ممتن','🎉 متحمس','😢 حزين','💪 قوي'].map(x=><button key={x} onClick={()=>setMood(x)}>{x}</button>)}</div><div className="publish-row"><span>العائلة فقط 🔒</span><button className="primary" disabled={busy||!storyText.trim()} onClick={publishStory}>نشر الحالة</button></div></div>}
{stories.length>0&&<div className="card stories"><div className="section-title"><div><h2>حالات العائلة</h2><span>تختفي تلقائياً بعد 24 ساعة</span></div><button className="add-story" onClick={()=>setStoryOpen(true)}>＋ حالتي</button></div><div className="story-list"><button className="story-add" onClick={()=>setStoryOpen(true)}><div className="story-avatar">＋</div><b>إضافة حالتي</b></button>{stories.map(st=><button className="story-card" key={st.id} onClick={()=>setViewStory(st)}><div className="story-avatar">{(st.author_id===session.user.id?initial:'ع')}</div><b>{st.author_id===session.user.id?'حالتي':'حالة من العائلة'}</b><small>{st.mood||'حالة عائلية'}</small></button>)}</div></div>}
{viewStory&&<div className="story-viewer" onClick={()=>setViewStory(null)}><div className="story-view-card" onClick={e=>e.stopPropagation()}><button className="story-close" onClick={()=>setViewStory(null)}>✕</button><div className="story-avatar big">{viewStory.author_id===session.user.id?initial:'ع'}</div><h3>{viewStory.author_id===session.user.id?'حالتي':'حالة من العائلة'}</h3><p>{viewStory.content}</p>{viewStory.mood&&<b>{viewStory.mood}</b>}<small>حالة تختفي بعد 24 ساعة</small></div></div>}
{filtered.length===0&&<div className="card empty"><div>📝</div><h3>{search?'لا توجد نتائج':'لا توجد منشورات بعد'}</h3><p>{search?'جرّب كلمة بحث أخرى.':'كن أول فرد في العائلة ينشر شيئاً.'}</p></div>}
{filtered.map(p=><article className="card post" key={p.id}><div className="post-head"><div className="avatar">{(p.author_name||'ع').slice(0,1)}</div><div><b>{p.author_name}</b><small>{new Date(p.created_at).toLocaleString('ar-LY')}</small></div><button className="dots">•••</button></div><p className="post-text">{p.mood&&<span className="post-mood">{p.mood} · </span>}{p.content}</p>{p.media?.length>0&&<div className={"post-media media-"+Math.min(p.media.length,4)}>{p.media.map((m:any)=><div key={m.id} className="media-item">{m.media_type==='video'?<video src={m.media_url} controls playsInline/>:<img src={m.media_url} alt="مرفق المنشور" loading="lazy"/>}</div>)}</div>}<div className="post-meta"><button className={p.liked?'liked':''} onClick={()=>toggleLike(p)}>👍 أعجبني <small>{p.likes}</small></button><button onClick={()=>document.getElementById('comment-'+p.id)?.focus()}>💬 تعليق <small>{p.comments.length}</small></button><button onClick={()=>share(p)}>↗ مشاركة</button></div>{p.comments.length>0&&<div className="comments">{p.comments.map(c=><div className="comment" key={c.id}><div className="avatar">{(c.author_name||'ع').slice(0,1)}</div><div><b>{c.author_name}</b><p>{c.content}</p></div></div>)}</div>}<div className="comment-box"><div className="avatar">{initial}</div><input id={'comment-'+p.id} value={p.commentText} onChange={e=>setPosts(prev=>prev.map(x=>x.id===p.id?{...x,commentText:e.target.value}:x))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addComment(p)}}} placeholder="اكتب تعليقاً..."/><button className="primary" onClick={()=>addComment(p)}>إرسال</button></div></article>)}
        </>}
      </section><aside className="rightbar"><div className="card"><h3>اختصارات العائلة</h3><button onClick={()=>r.push('/tree')}>🌳 شجرة العائلة <small>الأفراد والروابط</small></button><button onClick={()=>r.push('/profile')}>👤 ملفي الشخصي <small>تعديل بياناتك</small></button></div><div className="card tips"><h3>مساحتكم العائلية</h3><p>هذه شبكة خاصة بعائلتك. أضف الأفراد وابدأ مشاركة الذكريات.</p></div></aside>
    </div></main>
}
