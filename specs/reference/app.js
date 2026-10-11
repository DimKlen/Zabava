(function boot(){
if(!window.APPDATA){setTimeout(boot,30);return;}
const D=window.APPDATA;const {PLAT,PEOPLE,T,EPN,EPS,PROG,MY,GENRES}=D;
const TBY={};T.forEach(t=>TBY[t.id]=t);
const TODAY=new Date(2026,9,10);
const dOff=o=>{const d=new Date(TODAY);d.setDate(d.getDate()+o);return d;};
const fDay=o=>o===0?"Aujourd'hui":o===1?'Demain':dOff(o).toLocaleDateString('fr-CA',{weekday:'short',day:'numeric',month:'short'});
const fShort=o=>dOff(o).toLocaleDateString('fr-CA',{day:'numeric',month:'short'});
const fLong=o=>dOff(o).toLocaleDateString('fr-CA',{day:'numeric',month:'long',year:'numeric'});
const fRun=m=>!m?'Durée inconnue':m>=60?Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'):m+' min';
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const ini=s=>s.split(/\s+/).filter(w=>/[A-Za-zÀ-ÿ]/.test(w[0]||'')).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const pad=n=>String(n).padStart(2,'0');
const TYPE={movie:'Film',tv:'Série',anime:'Animé'};
const BGS=['linear-gradient(160deg,var(--color-accent-700),var(--color-neutral-900))','linear-gradient(160deg,var(--color-section-ghost),var(--color-section))','linear-gradient(160deg,var(--color-neutral-700),var(--color-neutral-900))','linear-gradient(160deg,var(--color-accent-800),var(--color-bg))','linear-gradient(160deg,var(--color-section-glow),var(--color-neutral-900))','linear-gradient(160deg,var(--color-neutral-600),var(--color-accent-900))','linear-gradient(200deg,var(--color-accent-600),var(--color-section))'];
const hash=s=>[...String(s)].reduce((a,ch)=>(a*31+ch.charCodeAt(0))>>>0,7);
const bgOf=id=>BGS[hash(id)%BGS.length];
const ALLP=[...new Set(T.flatMap(t=>(t.cast||[]).map(c=>c[0])))];
const CHIP=(label,on,fn)=>({label,select:fn,border:on?'var(--color-accent)':'var(--color-neutral-800)',bg:on?'var(--color-accent-900)':'transparent',color:on?'var(--color-accent-200)':'var(--color-neutral-300)'});
const TAB=(label,on,fn)=>({label,select:fn,color:on?'var(--color-text)':'var(--color-neutral-500)',bar:on?'var(--color-accent)':'transparent'});
const SW=(label,on,fn)=>({label,toggle:fn,track:on?'var(--color-accent)':'var(--color-neutral-800)',knob:on?'20px':'2px',knobBg:on?'var(--color-bg)':'var(--color-neutral-400)'});
const advDefault=()=>({types:[],actors:[],actorQ:'',genres:[],yFrom:1990,yTo:2026,minR:0,avail:'all',lang:'Toutes',run:'Toutes',sort:'pop'});

function initState(){
  const eps={};
  Object.entries(PROG).forEach(([id,[ps,pe]])=>{TBY[id].seasons.forEach(([tot,aired],i)=>{for(let e=1;e<=aired;e++){if(i+1<ps||(i+1===ps&&e<=pe))eps[id+':'+(i+1)+':'+e]=true;}});});
  const my={};Object.entries(MY).forEach(([k,v])=>my[k]={...v});
  return {route:'login',busy:false,onbStep:0,onbTab:'movie',onbAdded:[],region:'Canada',lang:'Français (fr-CA)',plats:['netflix','crave','prime'],my,eps,tab:'watch',wlTab:'movie',wlSeg:'towatch',filmFilter:'all',sort:'added',collapsed:{done:true,abandoned:true},stack:[],dTab:'movie',upFilter:'all',noDateOpen:false,spoiler:false,notif:{eps:true,cinema:true,stream:true,seasons:true},recap:'9 h',bellOff:{},q:'',qLive:'',sTab:'all',recents:['Dune','Frieren','Pedro Pascal'],advOpen:false,advMode:false,adv:advDefault(),sheet:null,ep:null,platOpen:false,dlg:null,toast:null,sysAlert:false,swiped:null,dragId:null,dragX:0,pop:null,popCard:null,popN:0,loading:false};
}

function make(c){
  const S=()=>c.state;
  const A={};
  A.isW=(id,s,e)=>!!S().eps[id+':'+s+':'+e];
  A.addN=()=>{c._n=(c._n||100)+1;return c._n;};
  A.snap=()=>({my:S().my,eps:S().eps});
  A.buzz=()=>{try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}};
  A.toast=(msg,undo)=>{clearTimeout(c._tT);c.setState({toast:{msg,undo}});c._tT=setTimeout(()=>c.setState({toast:null}),5000);};
  A.setMy=(id,v)=>c.setState(s=>{const my={...s.my};if(v===null)delete my[id];else my[id]={...(my[id]||{}),...v};return {my};});
  A.mState=t=>{if(t.rel>0)return 'upcoming';const p=t.prov||{};if(['sub','rent','buy'].some(k=>(p[k]||[]).length))return 'avail';if(t.rel>-60)return 'cinema';return 'unknown';};
  A.mine=t=>((t.prov||{}).sub||[]).some(p=>S().plats.includes(p));
  A.bestPlat=t=>{const p=t.prov||{},m=S().plats,sub=p.sub||[],rent=p.rent||[],buy=p.buy||[];return sub.find(x=>m.includes(x))||sub[0]||rent.find(x=>m.includes(x))||rent[0]||buy[0];};
  A.badge=t=>{if(t.type!=='movie')return {text:PLAT[t.plat][0]};const st=A.mState(t);if(st==='upcoming')return {text:fShort(t.rel)};if(st==='cinema')return {text:'Au cinéma',hi:true};const b=A.bestPlat(t);return b?{text:PLAT[b][0]}:null;};
  A.epTitle=(t,s,e)=>EPN[(s*7+e*3+t.id.length)%EPN.length];
  A.sInfo=t=>{const eps=[];let un=0;t.seasons.forEach(([tot,aired],i)=>{for(let e=1;e<=tot;e++){const a=e<=aired;eps.push({s:i+1,e,aired:a,u:a?-1:un++});}});
    const aired=eps.filter(x=>x.aired);const base=t.next!=null?t.next-7:-30;aired.forEach((x,i)=>x.off=base-7*(aired.length-1-i));eps.filter(x=>!x.aired).forEach(x=>x.off=(t.next||30)+7*x.u);
    const w=aired.filter(x=>A.isW(t.id,x.s,x.e)).length;const next=aired.find(x=>!A.isW(t.id,x.s,x.e));const up=eps.find(x=>!x.aired);return {eps,aired,w,next,up,remaining:aired.length-w};};
  A.sec=t=>{const m=S().my[t.id];if(!m)return null;if(m.status==='abandoned')return 'abandoned';const i=A.sInfo(t);if(i.w===0)return 'notstarted';if(i.next)return m.last>30?'stale':'watch';return t.ended?'done':'uptodate';};
  A.push=o=>c.setState(s=>({stack:[...s.stack,o],sheet:null,ep:null,swiped:null}));
  A.back=()=>c.setState(s=>({stack:s.stack.slice(0,-1)}));
  A.patchTop=p=>c.setState(s=>{const st=[...s.stack];st[st.length-1]={...st[st.length-1],...p};return {stack:st};});
  A.open=id=>{const t=TBY[id];let season=1;if(t.type!=='movie'){const i=A.sInfo(t);season=i.next?i.next.s:(i.up?i.up.s:t.seasons.length);}A.push({kind:'title',id,tab:'episodes',season,more:false});};
  A.openActor=n=>A.push({kind:'actor',name:n,tab:'movie',sort:'pop',more:false});
  A.openSearch=()=>{if(c.props.offline){A.toast('Recherche indisponible hors ligne');return;}c.setState({q:'',qLive:'',sTab:'all',advMode:false});A.push({kind:'search'});};
  A.enterApp=()=>{c.setState({route:'app',tab:'watch',loading:true,stack:[]});clearTimeout(c._ld);c._ld=setTimeout(()=>c.setState({loading:false}),700);};
  A.quick=id=>{const t=TBY[id];const sn=A.snap();if(S().my[id]){A.setMy(id,null);A.toast('Retiré de ma liste',sn);}else{A.setMy(id,t.type==='movie'?{status:'towatch',added:A.addN()}:{status:'following',added:A.addN(),last:999});A.buzz();A.toast(t.type==='movie'?'Ajouté à ma liste':'Série suivie',sn);}};
  A.quickQuiet=id=>{const t=TBY[id];if(S().my[id]){A.setMy(id,null);c.setState(s=>({onbAdded:s.onbAdded.filter(x=>x!==id)}));}else{A.setMy(id,t.type==='movie'?{status:'towatch',added:A.addN()}:{status:'following',added:A.addN(),last:999});c.setState(s=>({onbAdded:[...s.onbAdded,id]}));A.buzz();}};
  A.setWatched=(id,w)=>{const sn=A.snap();const m=S().my[id]||{};A.setMy(id,w?{status:'watched',watchedAt:0,added:m.added||A.addN()}:{status:'towatch'});if(w)A.buzz();A.toast(w?'Marqué comme vu':'Remis dans À voir',sn);};
  A.setEps=(id,list,val)=>{const sn=A.snap();c.setState(s=>{const eps={...s.eps};list.forEach(x=>{const k=id+':'+x.s+':'+x.e;if(val)eps[k]=true;else delete eps[k];});const my={...s.my};if(val)my[id]={...(my[id]||{status:'following',added:A.addN()}),last:0};return {eps,my,pop:val&&list.length===1?id+':'+list[0].s+':'+list[0].e:null};});if(val)A.buzz();A.toast(val?(list.length>1?list.length+' épisodes marqués comme vus':'Épisode marqué comme vu'):(list.length>1?'Saison décochée':'Épisode décoché'),sn);};
  A.checkEp=(t,x)=>{const i=A.sInfo(t);if(A.isW(t.id,x.s,x.e)){A.setEps(t.id,[x],false);return;}const prev=i.aired.filter(y=>(y.s<x.s||(y.s===x.s&&y.e<x.e))&&!A.isW(t.id,y.s,y.e));
    if(prev.length)c.setState({dlg:{title:prev.length===1?"Marquer aussi l'épisode précédent ?":'Marquer aussi les '+prev.length+' épisodes précédents ?',body:'',actions:[{label:'Seulement celui-ci',cls:'btn btn-secondary',run:()=>A.setEps(t.id,[x],true)},{label:'Oui',cls:'btn btn-primary',run:()=>A.setEps(t.id,[...prev,x],true)}]}});else A.setEps(t.id,[x],true);};
  A.filmMenu=id=>{const m=S().my[id];const w=m&&m.status==='watched';c.setState({sheet:{title:TBY[id].title,opts:[{label:w?'Marquer comme non vu':'Marquer comme vu',icon:w?'ph ph-eye-slash':'ph ph-eye',run:()=>A.setWatched(id,!w)},{label:'Retirer de ma liste',icon:'ph ph-trash',run:()=>{const sn=A.snap();A.setMy(id,null);A.toast('Retiré de ma liste',sn);}}]}});};
  A.showMenu=id=>{const m=S().my[id];const ab=m&&m.status==='abandoned';const off=!!S().bellOff[id];const opts=[];
    if(m)opts.push({label:ab?'Reprendre le suivi':'Abandonner',icon:ab?'ph ph-play-circle':'ph ph-pause-circle',run:()=>{const sn=A.snap();A.setMy(id,{status:ab?'following':'abandoned'});A.toast(ab?'Suivi repris':'Série abandonnée',sn);}});
    if(m)opts.push({label:'Ne plus suivre',icon:'ph ph-trash',run:()=>{const sn=A.snap();A.setMy(id,null);A.toast('Série retirée',sn);}});
    if(!m)opts.push({label:'Suivre',icon:'ph ph-plus',run:()=>A.quick(id)});
    opts.push({label:off?'Activer les alertes':'Couper les alertes',icon:off?'ph ph-bell-ringing':'ph ph-bell-slash',run:()=>c.setState(s=>({bellOff:{...s.bellOff,[id]:!off}}))});
    c.setState({sheet:{title:TBY[id].title,opts}});};
  A.lpDown=id=>()=>{clearTimeout(c._lp);c._lpF=false;c._lp=setTimeout(()=>{c._lpF=true;A.buzz();A.filmMenu(id);},480);};
  A.lpUp=()=>clearTimeout(c._lp);
  A.pv=(t,o={})=>{const inL=!!S().my[t.id];const b=o.badge===false?null:A.badge(t);
    return {title:t.title,initial:t.title.replace(/^(L'|Le |La |Les |The |Une )/,'').charAt(0).toUpperCase(),bg:bgOf(t.id),showTitle:!o.small,hasBadge:!!b,badge:b?b.text:'',badgeBg:b&&b.hi?'var(--color-accent-800)':'color-mix(in srgb, var(--color-bg) 80%, transparent)',badgeColor:b&&b.hi?'var(--color-accent-100)':'var(--color-text)',showAdd:o.add!==false,inList:inL,notInList:!inL,
      open:o.open||(()=>{if(c._lpF){c._lpF=false;return;}A.open(t.id);}),toggle:e=>{e.stopPropagation();(o.toggle||(()=>A.quick(t.id)))();},stop:e=>e.stopPropagation(),
      down:o.lp?A.lpDown(t.id):undefined,up:o.lp?A.lpUp:undefined,ctx:o.lp?(e=>{e.preventDefault();clearTimeout(c._lp);A.filmMenu(t.id);}):undefined};};
  A.swipe=id=>({down:e=>{c._dr={id,x:e.clientX,dx:0,moved:false,base:S().swiped===id?-150:0};},
    move:e=>{const d=c._dr;if(!d||d.id!==id)return;const dx=e.clientX-d.x;if(Math.abs(dx)>8)d.moved=true;if(d.moved){d.dx=Math.min(0,Math.max(-170,d.base+dx));c.setState({dragId:id,dragX:d.dx});}},
    up:()=>{const d=c._dr;if(!d||d.id!==id)return;c._dr=null;if(d.moved){c._sup=true;setTimeout(()=>c._sup=false,60);c.setState({dragId:null,swiped:d.dx<-60?id:null});}}});
  A.cardVM=t=>{const s=S(),i=A.sInfo(t),n=i.next,hide=s.spoiler;const h=A.swipe(t.id);const drag=s.dragId===t.id,sw=s.swiped===t.id;
    return {name:t.title,code:'S'+pad(n.s)+' E'+pad(n.e)+' · '+(hide?'Épisode '+n.e:A.epTitle(t,n.s,n.e)),remaining:i.remaining>1?i.remaining+' épisodes restants':'Dernier épisode disponible',pct:Math.round(i.w/Math.max(1,i.aired.length)*100)+'%',thumbBg:bgOf(t.id+n.s+'-'+n.e),thumbFilter:hide?'blur(6px)':'none',
      tx:(drag?s.dragX:sw?-150:0)+'px',tr:drag?'none':'transform .25s ease',anim:s.popCard===t.id?(s.popN%2?'in1':'in2')+' .4s ease':'none',down:h.down,move:h.move,up:h.up,
      click:()=>{if(c._sup)return;if(S().swiped===t.id){c.setState({swiped:null});return;}A.open(t.id);},
      check:e=>{e.stopPropagation();A.setEps(t.id,[n],true);c.setState(st=>({popCard:t.id,popN:st.popN+1}));},stop:e=>e.stopPropagation(),
      abandon:e=>{e.stopPropagation();const sn=A.snap();A.setMy(t.id,{status:'abandoned'});c.setState({swiped:null});A.toast('Série abandonnée',sn);},
      remove:e=>{e.stopPropagation();const sn=A.snap();A.setMy(t.id,null);c.setState({swiped:null});A.toast('Retirée de ma liste',sn);}};};
  A.rowVM=(t,k)=>{const i=A.sInfo(t);const label=k==='uptodate'?(i.up?'Prochain épisode le '+fShort(i.up.off):'En attente de la saison '+(t.seasons.length+1)):k==='done'?'Terminée · '+i.aired.length+' épisodes vus':'Abandonnée · '+i.w+'/'+i.aired.length+' vus';
    return {poster:A.pv(t,{small:true,add:false,badge:false,open:()=>{}}),name:t.title,label,open:()=>A.open(t.id)};};
  A.sRow=t=>{const inL=!!S().my[t.id];return {isTitle:true,isPerson:false,title:t.title,sub:t.year+' · '+TYPE[t.type],bg:bgOf(t.id),initials:'',open:()=>{A.addRecent();A.open(t.id);},add:e=>{e.stopPropagation();A.quick(t.id);},addIcon:inL?'ph ph-check':'ph ph-plus',addBg:inL?'var(--color-accent)':'transparent',addColor:inL?'var(--color-bg)':'var(--color-text)',addBorder:inL?'var(--color-accent)':'var(--color-neutral-700)'};};
  A.pRow=n=>{const w=T.filter(t=>(t.cast||[]).some(x=>x[0]===n));return {isTitle:false,isPerson:true,title:n,sub:'Personne · '+w.slice(0,2).map(x=>x.title).join(', '),bg:bgOf(n),initials:ini(n),open:()=>{A.addRecent();A.openActor(n);}};};
  A.addRecent=()=>{const q=S().q.trim();if(q)c.setState(s=>({recents:[q,...s.recents.filter(x=>x!==q)].slice(0,6)}));};
  A.advFilter=a=>{const RUN={'Moins de 1 h 30':90,'Moins de 2 h':120,'Moins de 2 h 30':150};
    let r=T.filter(t=>(!a.types.length||a.types.includes(t.type))&&(!a.genres.length||a.genres.some(g=>t.genres.includes(g)))&&a.actors.every(p=>(t.cast||[]).some(x=>x[0]===p))&&t.year>=a.yFrom&&t.year<=a.yTo&&(!a.minR||(t.imdb&&t.imdb>=a.minR))&&(a.avail==='all'||A.mine(t))&&(a.lang==='Toutes'||t.lang===a.lang)&&(a.run==='Toutes'||(t.run&&t.run<=RUN[a.run])));
    if(a.sort==='rating')r=[...r].sort((x,y)=>(y.imdb||0)-(x.imdb||0));else if(a.sort==='recent')r=[...r].sort((x,y)=>y.year-x.year);return r;};
  A.jumpDay=o=>{const el=c.mainRef.current;if(!el)return;const offs=(c._upOffs||[]).filter(x=>x>=o);if(!offs.length){A.toast('Rien de prévu à partir de ce jour');return;}const g=el.querySelector('#up-'+offs[0]);if(g)el.scrollTo({top:g.offsetTop-72,behavior:'smooth'});};
  return A;
}

function vals(c){
  const A=c.A||(c.A=make(c));const s=c.state,off=!!c.props.offline;const v={};
  v.zoom=c.state.zoom||1;v.offline=off;v.isLogin=s.route==='login';v.isOnb=s.route==='onb';v.isNotif=s.route==='notif';v.isApp=s.route==='app';
  // login
  v.mosaic=[0,1,2].map(k=>{const a=T.filter((_,i)=>i%3===k);return {anim:'drift '+(70+k*20)+'s linear infinite'+(k%2?' reverse':''),tiles:[...a,...a].map(t=>({bg:bgOf(t.id)}))};});
  v.busy=s.busy;v.notBusy=!s.busy;v.login=()=>{if(s.busy)return;c.setState({busy:true});setTimeout(()=>c.setState({busy:false,route:'onb',onbStep:0}),900);};
  // onboarding
  v.onbSteps=[0,1,2].map(i=>({bg:i<=s.onbStep?'var(--color-accent)':'var(--color-neutral-800)'}));
  v.onb1=s.onbStep===0;v.onb2=s.onbStep===1;v.onb3=s.onbStep===2;v.hasOnbBack=s.onbStep>0;
  v.regions=['Canada','France','Belgique','Suisse','États-Unis'];v.langs=['Français (fr-CA)','Français (fr-FR)','English (en-CA)','English (en-US)'];
  v.region=s.region;v.lang=s.lang;v.setRegion=e=>c.setState({region:e.target.value});v.setLang=e=>c.setState({lang:e.target.value});
  v.platTiles=Object.entries(PLAT).map(([k,[n,sh]])=>{const on=s.plats.includes(k);return {name:n,short:sh,on,off:!on,toggle:()=>c.setState(st=>({plats:on?st.plats.filter(x=>x!==k):[...st.plats,k]})),border:on?'var(--color-accent)':'transparent',bg:on?'var(--color-accent-900)':'var(--color-surface)'};});
  v.onbTabs=[['movie','Films'],['tv','Séries'],['anime','Animés']].map(([k,l])=>TAB(l,s.onbTab===k,()=>c.setState({onbTab:k})));
  v.onbPosters=T.filter(t=>t.type===s.onbTab).map(t=>A.pv(t,{badge:false,open:()=>A.quickQuiet(t.id),toggle:()=>A.quickQuiet(t.id)}));
  const na=s.onbAdded.length;v.onbCount=na===0?"Touche une affiche pour l'ajouter":na+(na>1?' titres ajoutés':' titre ajouté');
  v.onbNextLabel=s.onbStep===2?'Terminer':'Continuer';v.onbNext=()=>s.onbStep<2?c.setState({onbStep:s.onbStep+1}):c.setState({route:'notif'});v.onbBack=()=>c.setState({onbStep:Math.max(0,s.onbStep-1)});
  // notif
  v.sysAlert=s.sysAlert;v.notifAllow=()=>c.setState({sysAlert:true});v.notifLater=()=>A.enterApp();v.sysAllow=()=>{c.setState({sysAlert:false});A.enterApp();};v.sysDeny=()=>{c.setState({sysAlert:false,notif:{eps:false,cinema:false,stream:false,seasons:false}});A.enterApp();};
  // tabs
  v.tabItems=[['watch','Ma liste','bookmark-simple'],['discover','Découvrir','compass'],['upcoming','À venir','calendar-blank'],['profile','Profil','user-circle']].map(([k,l,ic])=>({label:l,icon:(s.tab===k?'ph-fill ph-':'ph ph-')+ic,color:s.tab===k?'var(--color-accent)':'var(--color-neutral-500)',select:()=>c.setState({tab:k,swiped:null})}));
  v.isWatch=s.tab==='watch';v.isDiscover=s.tab==='discover';v.isUpcoming=s.tab==='upcoming';v.isProfile=s.tab==='profile';v.openSearch=()=>A.openSearch();
  v.loading=s.loading;v.notLoading=!s.loading;v.skel=Array.from({length:9},(_,i)=>({i}));v.skelCards=[1,2,3];
  // watchlist
  v.wlTabs=[['movie','Films'],['tv','Séries'],['anime','Animés']].map(([k,l])=>TAB(l,s.wlTab===k,()=>c.setState({wlTab:k,swiped:null})));
  v.wlFilms=s.wlTab==='movie';v.wlSeries=!v.wlFilms;
  const movies=T.filter(t=>t.type==='movie'&&s.my[t.id]);
  v.segA=s.wlSeg==='towatch';v.segB=!v.segA;v.setSegA=()=>c.setState({wlSeg:'towatch'});v.setSegB=()=>c.setState({wlSeg:'watched'});
  v.filmChips=[['all','Tout'],['mine','Sur mes plateformes'],['cinema','Au cinéma'],['upcoming','Pas encore sorti']].map(([k,l])=>CHIP(l,s.filmFilter===k,()=>c.setState({filmFilter:k})));
  let fl=movies.filter(t=>s.my[t.id].status===(v.segA?'towatch':'watched'));const totalSeg=fl.length;
  if(v.segA){if(s.filmFilter==='mine')fl=fl.filter(t=>A.mState(t)==='avail'&&A.mine(t));if(s.filmFilter==='cinema')fl=fl.filter(t=>A.mState(t)==='cinema');if(s.filmFilter==='upcoming')fl=fl.filter(t=>A.mState(t)==='upcoming');
    const so=s.sort;fl=[...fl].sort((a,b)=>so==='title'?a.title.localeCompare(b.title,'fr'):so==='release'?a.rel-b.rel:so==='imdb'?(b.imdb||0)-(a.imdb||0):s.my[b.id].added-s.my[a.id].added);}
  else fl=[...fl].sort((a,b)=>(s.my[b.id].watchedAt||0)-(s.my[a.id].watchedAt||0));
  const SORTS={added:"Date d'ajout",release:'Date de sortie',title:'Titre',imdb:'Note IMDb'};
  v.sortLabel=SORTS[s.sort];v.openSort=()=>c.setState({sheet:{title:'Trier par',opts:Object.entries(SORTS).map(([k,l])=>({label:l,icon:s.sort===k?'ph ph-check':'ph ph-circle',run:()=>c.setState({sort:k})}))}});
  v.filmGrid=fl.map(t=>A.pv(t,{lp:true}));v.filmHas=fl.length>0;v.filmEmpty=!v.filmHas;v.filmCount=fl.length+(fl.length>1?' films':' film');
  if(v.segB){v.emptyTitle='Aucun film vu pour l’instant';v.emptyText='Les films que tu marques comme vus apparaîtront ici.';v.emptyCta='Voir ma liste';v.emptyAction=v.setSegA;}
  else if(!totalSeg){v.emptyTitle='Ta liste est vide';v.emptyText='Ajoute des films pour les retrouver ici.';v.emptyCta='Découvrir des films';v.emptyAction=()=>c.setState({tab:'discover',dTab:'movie'});}
  else {v.emptyTitle='Aucun film pour ce filtre';v.emptyText='Essaie un autre filtre.';v.emptyCta='Tout afficher';v.emptyAction=()=>c.setState({filmFilter:'all'});}
  // series
  const shows=T.filter(t=>t.type===s.wlTab&&s.my[t.id]);const g={watch:[],stale:[],notstarted:[],uptodate:[],done:[],abandoned:[]};
  if(v.wlSeries){shows.forEach(t=>{const k=A.sec(t);if(k)g[k].push(t);});g.watch.sort((a,b)=>s.my[a.id].last-s.my[b.id].last);g.stale.sort((a,b)=>s.my[a.id].last-s.my[b.id].last);}
  const SECS=[['watch','À regarder','cards'],['stale','Pas regardé depuis un moment','cards'],['notstarted','Pas encore commencées','carousel'],['uptodate','À jour','rows'],['done','Terminées','rows'],['abandoned','Abandonnées','rows']];
  v.serSections=SECS.filter(([k])=>g[k].length).map(([k,l,kind])=>{const op=!s.collapsed[k];return {title:l,count:String(g[k].length),caret:op?'ph ph-caret-up':'ph ph-caret-down',toggle:()=>c.setState(st=>({collapsed:{...st.collapsed,[k]:!st.collapsed[k]}})),isCards:kind==='cards'&&op,isCarousel:kind==='carousel'&&op,isRows:kind==='rows'&&op,
    items:g[k].map(t=>kind==='cards'?A.cardVM(t):kind==='carousel'?{poster:A.pv(t),start:()=>A.push({kind:'title',id:t.id,tab:'episodes',season:1,more:false})}:A.rowVM(t,k))};});
  v.serHas=shows.length>0;v.serEmpty=!v.serHas;v.serEmptyTitle=s.wlTab==='tv'?'Aucune série suivie':'Aucun animé suivi';v.serEmptyCta=s.wlTab==='tv'?'Découvrir des séries':'Découvrir des animés';v.serEmptyAction=()=>c.setState({tab:'discover',dTab:s.wlTab});
  v.swipeHint=v.wlSeries&&g.watch.length>0;
  // discover
  v.dTabs=[['movie','Films'],['tv','Séries'],['anime','Animés']].map(([k,l])=>TAB(l,s.dTab===k,()=>c.setState({dTab:k})));
  const dt=s.dTab,ofT=T.filter(t=>t.type===dt),byR=ofT.filter(t=>t.imdb).sort((a,b)=>b.imdb-a.imdb);let secs;
  if(dt==='movie')secs=[['Tendances de la semaine',ofT.filter(t=>A.mState(t)!=='upcoming').slice(0,8)],['Au cinéma',ofT.filter(t=>A.mState(t)==='cinema')],['Bientôt en salle',ofT.filter(t=>A.mState(t)==='upcoming')],['Nouveautés sur mes plateformes',ofT.filter(t=>A.mState(t)==='avail'&&A.mine(t)).sort((a,b)=>b.rel-a.rel)],['Les mieux notés',byR]];
  else{secs=[['Tendances',ofT],['Nouvelles saisons cette semaine',ofT.filter(t=>t.seasons.some(([a,b])=>b<a&&b>0)||(t.next!=null&&t.next<=7))],['Populaires sur mes plateformes',ofT.filter(A.mine)],['Les mieux notés',byR]];if(dt==='anime')secs.push(['Animés de la saison en cours',ofT.filter(t=>t.seasons.some(([a,b])=>b<a))]);}
  v.dSections=secs.filter(x=>x[1].length).map(([title,l])=>({title,items:l.map(t=>A.pv(t))}));
  v.genreTiles=GENRES.map((gn,i)=>({label:gn,bg:BGS[(i+2)%BGS.length],open:()=>A.push({kind:'list',title:gn,type:dt,genre:gn})}));
  v.discoverOn=!off;v.discoverOff=off;
  // upcoming
  const ev=[],nod=[];
  T.forEach(t=>{const m=s.my[t.id];if(!m)return;if(s.upFilter!=='all'&&s.upFilter!==t.type)return;
    if(t.type==='movie'){if(m.status!=='towatch')return;if(t.rel>0&&t.rel<=90)ev.push({off:t.rel,t,label:'Sortie en salle',plat:'Cinéma'});if(t.event)ev.push({off:t.event.off,t,label:t.event.label,plat:''});}
    else{if(m.status==='abandoned')return;const i=A.sInfo(t);const ups=i.eps.filter(x=>!x.aired&&x.off<=90);ups.forEach(x=>ev.push({off:x.off,t,ep:x,plat:PLAT[t.plat][0]}));if(!i.eps.some(x=>!x.aired)&&!t.ended)nod.push(t);}});
  const offs=[...new Set(ev.map(e=>e.off))].sort((a,b)=>a-b);c._upOffs=offs;
  v.upChips=[['all','Tout'],['movie','Films'],['tv','Séries'],['anime','Animés']].map(([k,l])=>CHIP(l,s.upFilter===k,()=>c.setState({upFilter:k})));
  v.week=[0,1,2,3,4,5,6].map(o=>({wd:dOff(o).toLocaleDateString('fr-CA',{weekday:'short'}).replace('.',''),num:String(dOff(o).getDate()),dot:offs.includes(o)?'var(--color-accent)':'transparent',bg:o===0?'var(--color-accent-900)':'transparent',color:o===0?'var(--color-accent-200)':'var(--color-text)',select:()=>A.jumpDay(o)}));
  v.upGroups=offs.map(o=>({id:'up-'+o,label:fDay(o),items:ev.filter(e=>e.off===o).map(e=>({bg:bgOf(e.t.id),title:e.t.title,line:e.ep?'S'+pad(e.ep.s)+' E'+pad(e.ep.e)+' · '+e.t.air:e.label,plat:e.plat,hasPlat:!!e.plat,kind:TYPE[e.t.type],open:()=>A.open(e.t.id)}))}));
  v.noDate=nod.map(t=>({bg:bgOf(t.id),title:t.title,line:'Saison '+(t.seasons.length+1)+' annoncée, date à venir',open:()=>A.open(t.id)}));v.hasNoDate=nod.length>0;v.noDateOpen=s.noDateOpen;v.noDateCaret=s.noDateOpen?'ph ph-caret-up':'ph ph-caret-down';v.toggleNoDate=()=>c.setState({noDateOpen:!s.noDateOpen});
  v.upEmpty=!offs.length&&!nod.length;v.upHas=!v.upEmpty;v.upCta=()=>c.setState({tab:'discover',dTab:'tv'});
  // profile
  v.platSummary=s.plats.length?s.plats.map(p=>PLAT[p][0]).join(', '):'Aucune';v.openPlats=()=>c.setState({platOpen:true});v.platOpen=s.platOpen;v.closePlats=()=>c.setState({platOpen:false});
  v.notifSwitches=[['eps','Nouveaux épisodes'],['cinema','Sorties en salle'],['stream','Disponibilité en streaming'],['seasons','Nouvelles saisons']].map(([k,l])=>SW(l,s.notif[k],()=>c.setState(st=>({notif:{...st.notif,[k]:!st.notif[k]}}))));
  v.recap=s.recap;v.recaps=['9 h','8 h','12 h','18 h','20 h'];v.setRecap=e=>c.setState({recap:e.target.value});
  v.spoilerSw=SW('Protection anti-spoiler',s.spoiler,()=>c.setState({spoiler:!s.spoiler}));
  v.logout=()=>c.setState({dlg:{title:'Se déconnecter ?',body:'Ta liste reste sauvegardée sur ton compte.',actions:[{label:'Annuler',cls:'btn btn-secondary',run:()=>{}},{label:'Se déconnecter',cls:'btn btn-primary',run:()=>c.setState({route:'login',stack:[]})}]}});
  v.deleteAcc=()=>c.setState({dlg:{title:'Supprimer ton compte ?',body:"Ta liste, ton suivi d'épisodes et tes réglages seront effacés définitivement.",actions:[{label:'Annuler',cls:'btn btn-secondary',run:()=>{}},{label:'Supprimer',cls:'btn btn-primary',run:()=>c.setState({...initState(),zoom:s.zoom})}]}});
  // overlays
  const top=s.stack[s.stack.length-1];v.back=()=>A.back();
  v.ovTitle=!!top&&top.kind==='title';v.ovActor=!!top&&top.kind==='actor';v.ovList=!!top&&top.kind==='list';v.ovSearch=!!top&&top.kind==='search';
  v.d={};v.a={};v.l={};
  if(v.ovTitle){const t=TBY[top.id],isM=t.type==='movie',m=s.my[t.id];const d={title:t.title,bg:bgOf(t.id),poster:A.pv(t,{add:false,badge:false,open:()=>{}}),isMovie:isM,isShow:!isM};
    d.meta=isM?[t.year,t.run?fRun(t.run):null,t.cert].filter(Boolean).join(' · '):[t.year,PLAT[t.plat][0],t.status].join(' · ');d.genres=t.genres.join(', ');
    d.hasImdb=!!t.imdb;d.imdb=t.imdb?String(t.imdb).replace('.',',')+'/10':'';d.votes=t.votes?t.votes+' votes':'';d.hasRt=t.rt!=null;d.rt=t.rt+' %';d.rtIcon=t.rt>=60?'ph-fill ph-smiley':'ph-fill ph-smiley-sad';
    const bo=!!s.bellOff[t.id];d.bellIcon=bo?'ph ph-bell-slash':'ph ph-bell-ringing';d.toggleBell=()=>{c.setState(st=>({bellOff:{...st.bellOff,[t.id]:!bo}}));A.toast(bo?'Alertes activées pour ce titre':'Alertes coupées pour ce titre');};
    if(isM){d.addLabel=m?'Dans ma liste':'Ajouter à ma liste';d.addIcon=m?'ph ph-check':'ph ph-plus';d.toggleList=()=>A.quick(t.id);const w=m&&m.status==='watched';d.watchLabel=w?'Vu':'Marquer comme vu';d.watchIcon=w?'ph-fill ph-eye':'ph ph-eye';d.toggleWatch=()=>A.setWatched(t.id,!w);
      const st=A.mState(t);d.statusText=st==='upcoming'?'En salle le '+fShort(t.rel):st==='cinema'?'Au cinéma maintenant':st==='avail'?(t.dig!=null?'Disponible en numérique depuis le '+fShort(t.dig):'Disponible en streaming'):'Pas encore de date';d.statusIcon=st==='upcoming'?'ph ph-calendar-blank':st==='cinema'?'ph ph-film-slate':st==='avail'?'ph ph-television-simple':'ph ph-question';}
    else{const i=A.sInfo(t);d.hasNextEp=!!i.up;d.nextEp=i.up?'Prochain épisode : S'+pad(i.up.s)+' E'+pad(i.up.e)+' le '+fShort(i.up.off):'';
      d.followLabel=!m?'Suivre':m.status==='abandoned'?'Abandonnée':'Suivie';d.followIcon=!m?'ph ph-plus':m.status==='abandoned'?'ph ph-pause-circle':'ph ph-check';d.toggleFollow=()=>m?A.showMenu(t.id):A.quick(t.id);d.openMenu=()=>A.showMenu(t.id);
      d.detailTabs=[['episodes','Épisodes'],['infos','Infos']].map(([k,l])=>TAB(l,top.tab===k,()=>A.patchTop({tab:k})));
      d.seasons=t.seasons.map((_,x)=>CHIP('Saison '+(x+1),top.season===x+1,()=>A.patchTop({season:x+1})));
      const sEps=i.eps.filter(x=>x.s===top.season),airedS=sEps.filter(x=>x.aired),wS=airedS.filter(x=>A.isW(t.id,x.s,x.e)).length;
      d.seasonName='Saison '+top.season;d.seasonSeen=wS+'/'+sEps.length+' vus';d.seasonPct=(sEps.length?Math.round(wS/sEps.length*100):0)+'%';const all=airedS.length>0&&wS===airedS.length;
      d.hasAired=airedS.length>0;d.allLabel=all?'Saison vue':'Tout marquer comme vu';d.allBg=all?'var(--color-accent)':'transparent';d.allColor=all?'var(--color-bg)':'var(--color-accent)';
      d.markAll=()=>{all?A.setEps(t.id,airedS,false):A.setEps(t.id,airedS.filter(x=>!A.isW(t.id,x.s,x.e)),true);};
      d.eps=sEps.map(x=>{const w=A.isW(t.id,x.s,x.e),hide=s.spoiler&&!w;return {code:'E'+pad(x.e),name:hide?'Épisode '+x.e:A.epTitle(t,x.s,x.e),meta:x.aired?fLong(x.off)+' · '+fRun(t.run):fDay(x.off)+' · '+t.air,aired:x.aired,opacity:x.aired?'1':'.45',watched:w,unwatched:!w,thumbBg:bgOf(t.id+x.s+'-'+x.e),thumbFilter:hide?'blur(6px)':'none',anim:s.pop===t.id+':'+x.s+':'+x.e?'pop .35s ease':'none',check:e=>{e.stopPropagation();A.checkEp(t,x);},open:()=>c.setState({ep:{id:t.id,s:x.s,e:x.e}})};});}
    d.showEpisodes=!isM&&top.tab==='episodes';d.showInfo=isM||top.tab==='infos';
    const pv=t.prov||{};d.provGroups=[['sub','Abonnement'],['rent','Location'],['buy','Achat']].filter(([k])=>(pv[k]||[]).length).map(([k,l])=>({label:l,items:[...pv[k]].sort((a,b)=>s.plats.includes(b)-s.plats.includes(a)).map(p=>({name:PLAT[p][0],short:PLAT[p][1],ring:s.plats.includes(p)?'var(--color-accent)':'var(--color-neutral-700)',open:()=>A.toast('Ouverture de '+PLAT[p][0]+'…')}))}));
    d.hasProv=d.provGroups.length>0;d.noProv=!d.hasProv;
    d.syn=t.syn;d.clamp=top.more?'unset':'3';d.moreLabel=top.more?'Voir moins':'Voir plus';d.toggleMore=()=>A.patchTop({more:!top.more});d.trailer=()=>A.toast('Ouverture de YouTube…');
    d.cast=(t.cast||[]).map(([n,r])=>({initials:ini(n),name:n,role:r,bg:bgOf(n),open:()=>A.openActor(n)}));d.hasCast=d.cast.length>0;
    d.crewTitle=isM?'Équipe':'Créateurs';d.crew=isM?[{k:'Réalisation',v:t.dir},{k:'Scénario',v:t.wri||t.dir}]:[{k:'Création',v:t.creators},{k:'Diffusion',v:t.network}];
    d.infos=isM?[{k:'Titre original',v:t.orig||t.title},{k:'Sortie ('+s.region+')',v:fLong(t.rel)},{k:'Langue originale',v:t.lang},{k:'Pays',v:t.country},{k:'Studio',v:t.studio}]:[{k:'Titre original',v:t.orig||t.title},{k:'Genres',v:t.genres.join(', ')},{k:'Saisons',v:t.seasons.length+' saisons · '+t.seasons.reduce((a,b)=>a+b[0],0)+' épisodes'},{k:'Langue originale',v:t.lang},{k:'Pays',v:t.country}];
    d.hasSaga=!!(t.saga&&t.saga.length);d.saga=(t.saga||[]).map(id=>A.pv(TBY[id]));
    d.similar=T.filter(x=>x.id!==t.id&&x.type===t.type&&x.genres.some(gn=>t.genres.includes(gn))).slice(0,8).map(x=>A.pv(x));d.hasSimilar=d.similar.length>0;v.d=d;}
  if(v.ovActor){const n=top.name,info=PEOPLE[n],works=T.filter(t=>(t.cast||[]).some(x=>x[0]===n));const f=info&&info[2]==='f';
    const roles=works.slice(0,3).map(w=>w.title+' ('+w.cast.find(x=>x[0]===n)[1]+')');
    const a={name:n,initials:ini(n),bg:bgOf(n),born:info?(f?'Née':'Né')+' le '+info[0]+' à '+info[1]:'Date et lieu de naissance non renseignés',
      bio:n+(info?(f?' est une actrice née à ':' est un acteur né à ')+info[1].split(',')[0]+'.':'.')+' On le retrouve notamment dans '+roles.join(', ')+'. Sa filmographie complète est fournie par TMDB et mise à jour quotidiennement.',
      clamp:top.more?'unset':'2',moreLabel:top.more?'Voir moins':'Voir plus',toggleMore:()=>A.patchTop({more:!top.more})};
    if(f)a.bio=a.bio.replace('On le retrouve','On la retrouve');
    a.tabs=[['movie','Films'],['tv','Séries']].map(([k,l])=>TAB(l,top.tab===k,()=>A.patchTop({tab:k})));
    a.sorts=[['pop','Popularité'],['recent','Plus récent']].map(([k,l])=>CHIP(l,top.sort===k,()=>A.patchTop({sort:k})));
    let gw=works.filter(w=>top.tab==='movie'?w.type==='movie':w.type!=='movie');if(top.sort==='recent')gw=[...gw].sort((x,y)=>y.year-x.year);
    a.grid=gw.map(w=>A.pv(w));a.has=gw.length>0;a.empty=!a.has;v.a=a;}
  if(v.ovList){const r=T.filter(t=>t.type===top.type&&t.genres.includes(top.genre));v.l={title:top.genre,count:r.length+' '+(top.type==='movie'?'films':top.type==='tv'?'séries':'animés'),grid:r.map(t=>A.pv(t)),has:r.length>0,empty:!r.length};}
  // search
  v.q=s.q;v.onQ=e=>{const q=e.target.value;c.setState({q});clearTimeout(c._qT);c._qT=setTimeout(()=>c.setState({qLive:q}),300);};
  v.advMode=s.advMode;v.notAdv=!s.advMode;v.qEmpty=!s.q.trim()&&!s.advMode;v.qHas=!!s.q.trim()&&!s.advMode;
  v.recents=s.recents.map(r=>({label:r,pick:()=>c.setState({q:r,qLive:r}),remove:e=>{e.stopPropagation();c.setState(st=>({recents:st.recents.filter(x=>x!==r)}));}}));v.hasRecents=s.recents.length>0;v.clearRecents=()=>c.setState({recents:[]});
  v.trends=['odyssey','frieren','bear','obaa','dandadan'].map(id=>A.sRow(TBY[id]));
  v.sTabs=[['all','Tout'],['movie','Films'],['tv','Séries'],['anime','Animés'],['person','Personnes']].map(([k,l])=>TAB(l,s.sTab===k,()=>c.setState({sTab:k})));
  const nq=norm(s.qLive.trim());let rows=[];
  if(nq){const ts=T.filter(t=>norm(t.title).includes(nq)||norm(t.orig).includes(nq));const ps=ALLP.filter(p=>norm(p).includes(nq));
    if(s.sTab==='person')rows=ps.map(A.pRow);else if(s.sTab==='all')rows=[...ps.slice(0,3).map(A.pRow),...ts.map(A.sRow)];else rows=ts.filter(t=>t.type===s.sTab).map(A.sRow);}
  v.sPending=v.qHas&&s.q!==s.qLive;v.sShow=v.qHas&&!v.sPending&&rows.length>0;v.sNone=v.qHas&&!v.sPending&&!rows.length;v.sResults=rows;v.sNoneText='Aucun résultat pour « '+s.qLive.trim()+' »';
  v.openAdv=()=>c.setState({advOpen:true});v.closeAdv=()=>c.setState({advOpen:false});v.cancelSearch=()=>A.back();v.exitAdv=()=>c.setState({advMode:false});v.advOpen=s.advOpen;
  const ad=s.adv,setA=p=>c.setState(st=>({adv:{...st.adv,...p}}));
  v.advTypes=[['movie','Films'],['tv','Séries'],['anime','Animés']].map(([k,l])=>CHIP(l,ad.types.includes(k),()=>setA({types:ad.types.includes(k)?ad.types.filter(x=>x!==k):[...ad.types,k]})));
  v.advGenres=GENRES.map(gn=>CHIP(gn,ad.genres.includes(gn),()=>setA({genres:ad.genres.includes(gn)?ad.genres.filter(x=>x!==gn):[...ad.genres,gn]})));
  v.actorQ=ad.actorQ;v.onActorQ=e=>setA({actorQ:e.target.value});
  v.actorSugg=ad.actorQ.trim()?ALLP.filter(p=>norm(p).includes(norm(ad.actorQ))&&!ad.actors.includes(p)).slice(0,4).map(p=>({name:p,pick:()=>setA({actors:[...ad.actors,p],actorQ:''})})):[];v.hasSugg=v.actorSugg.length>0;
  v.actorChips=ad.actors.map(p=>({name:p,remove:()=>setA({actors:ad.actors.filter(x=>x!==p)})}));v.hasActors=ad.actors.length>0;
  v.yFrom=ad.yFrom;v.yTo=ad.yTo;v.setYFrom=e=>setA({yFrom:Math.min(+e.target.value,ad.yTo)});v.setYTo=e=>setA({yTo:Math.max(+e.target.value,ad.yFrom)});v.yearsLabel=ad.yFrom+' – '+ad.yTo;
  v.minR=ad.minR;v.setMinR=e=>setA({minR:+e.target.value});v.minRLabel=ad.minR?String(ad.minR).replace('.',',')+'/10 minimum':'Toutes les notes';
  v.advAvail=[['all','Toutes les plateformes'],['mine','Mes plateformes']].map(([k,l])=>CHIP(l,ad.avail===k,()=>setA({avail:k})));
  v.advLang=ad.lang;v.advLangs=['Toutes','Anglais','Français','Japonais'];v.setAdvLang=e=>setA({lang:e.target.value});
  v.advRun=ad.run;v.advRuns=['Toutes','Moins de 1 h 30','Moins de 2 h','Moins de 2 h 30'];v.setAdvRun=e=>setA({run:e.target.value});
  v.advSorts=[['pop','Popularité'],['rating','Mieux notés'],['recent','Plus récents']].map(([k,l])=>CHIP(l,ad.sort===k,()=>setA({sort:k})));
  const res=A.advFilter(ad);v.advCount='Voir les '+res.length+' résultat'+(res.length>1?'s':'');v.applyAdv=()=>c.setState({advOpen:false,advMode:true});v.resetAdv=()=>c.setState({adv:advDefault()});
  v.advGrid=res.map(t=>A.pv(t));v.advHeader=res.length+' résultat'+(res.length>1?'s':'');v.advHas=res.length>0;v.advEmpty=!res.length;
  // sheets
  v.sheetOpen=!!s.sheet;v.sheetTitle=s.sheet?s.sheet.title:'';v.sheetOpts=s.sheet?s.sheet.opts.map(o=>({label:o.label,icon:o.icon,run:()=>{c.setState({sheet:null});o.run();}})):[];v.closeSheet=()=>c.setState({sheet:null});
  v.epOpen=!!s.ep;v.ep={};v.closeEp=()=>c.setState({ep:null});
  if(s.ep){const t=TBY[s.ep.id],i=A.sInfo(t),x=i.eps.find(y=>y.s===s.ep.s&&y.e===s.ep.e),w=A.isW(t.id,x.s,x.e),hide=s.spoiler&&!w;
    v.ep={title:hide?'Épisode '+x.e:A.epTitle(t,x.s,x.e),code:'S'+pad(x.s)+' E'+pad(x.e)+' · '+t.title,meta:(x.aired?fLong(x.off):fDay(x.off)+' · '+t.air)+' · '+fRun(t.run),syn:hide?"Synopsis masqué tant que l'épisode n'est pas vu (anti-spoiler).":EPS[(x.s+x.e)%EPS.length]+' '+t.title+', saison '+x.s+'.',
      hasImdb:x.aired,imdb:(7+((x.s*3+x.e*7)%25)/10).toFixed(1).replace('.',',')+'/10',bg:bgOf(t.id+x.s+'-'+x.e),filter:hide?'blur(10px)':'none',canCheck:x.aired,cantCheck:!x.aired,label:w?'Vu':'Marquer comme vu',icon:w?'ph ph-check':'ph ph-eye',cls:w?'btn btn-secondary':'btn btn-primary',toggle:()=>A.checkEp(t,x)};}
  v.dlgOpen=!!s.dlg;v.dlgTitle=s.dlg?s.dlg.title:'';v.dlgBody=s.dlg?s.dlg.body:'';v.hasDlgBody=!!(s.dlg&&s.dlg.body);v.dlgActions=s.dlg?s.dlg.actions.map(a=>({label:a.label,cls:a.cls,run:()=>{c.setState({dlg:null});a.run();}})):[];
  v.toastOpen=!!s.toast;v.toastMsg=s.toast?s.toast.msg:'';v.toastUndo=!!(s.toast&&s.toast.undo);v.undo=()=>{const t=c.state.toast;if(t&&t.undo)c.setState({my:t.undo.my,eps:t.undo.eps,toast:null});};
  v.toastBottom=s.route==='app'&&!top?'96px':'34px';
  return v;
}
window.APP={initState,vals,make};
})();
