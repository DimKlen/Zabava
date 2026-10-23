(function(){
const TODAY=new Date(2026,9,10);
const dOff=o=>{const d=new Date(TODAY);d.setDate(d.getDate()+o);return d;};
const fShort=o=>dOff(o).toLocaleDateString('fr-CA',{day:'numeric',month:'short'});
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const dayLabel=o=>o===0?"Aujourd'hui":o===-1?'Hier':cap(dOff(o).toLocaleDateString('fr-CA',{weekday:'short',day:'numeric',month:'short'}));
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const hash=s=>[...String(s)].reduce((a,ch)=>(a*31+ch.charCodeAt(0))>>>0,7);
const BGS=['linear-gradient(160deg,var(--color-accent-700),var(--color-neutral-900))','linear-gradient(160deg,var(--color-section-ghost),var(--color-section))','linear-gradient(160deg,var(--color-neutral-700),var(--color-neutral-900))','linear-gradient(160deg,var(--color-accent-800),var(--color-bg))','linear-gradient(160deg,var(--color-section-glow),var(--color-neutral-900))','linear-gradient(160deg,var(--color-neutral-600),var(--color-accent-900))','linear-gradient(200deg,var(--color-accent-600),var(--color-section))'];
const bgOf=k=>BGS[hash(k)%BGS.length];
const pad=n=>String(n).padStart(2,'0');
const hm=x=>{const p=x.split(':');return (+p[0])+' h '+p[1];};
const TAB=(label,on,fn)=>({label,select:fn,color:on?'var(--color-text)':'var(--color-neutral-500)',bar:on?'var(--color-accent)':'transparent'});
const SW=(label,on,fn)=>({label,toggle:fn,track:on?'var(--color-accent)':'var(--color-neutral-800)',knob:on?'20px':'2px',knobBg:on?'var(--color-bg)':'var(--color-neutral-400)'});
const EMPTYFB={label:'',icon:'',cls:'btn btn-secondary',tap:()=>{}};
const U={
'lea.m':{name:'Léa Martin',priv:false,them:true,me:'accepted',fw:['max.dubois','sarah.l','camille.r','ines.t','nora.k'],lib:'dune2:w,opp:w,anat:w,sinners:w,kpop:w,dune3:t,odyssey:t,bear:c4.5,whitelotus:d,severance:d,frieren:d,jjk:c3.2,shogun:t,pitt:c1.9,adolescence:d'},
'max.dubois':{name:'Max Dubois',priv:false,them:true,me:'accepted',fw:['lea.m','theo.g','lucas.m','hugo.p'],lib:'opp:w,f1:w,superman:w,obaa:w,odyssey:w,dune2:w,avengers:t,spider:t,andor:d,slow:c6.2,tlou:c2.7,stranger:d,solo:d,kaiju:c2.4'},
'sarah.l':{name:'Sarah Lefebvre',priv:false,them:false,me:'accepted',fw:['lea.m','nora.k','zoe.l'],lib:'monte:w,anat:w,wicked2:w,kpop:w,hailmary:t,odyssey:t,whitelotus:c3.6,bear:c3.8,adolescence:d,spy:c3.5,frieren:c2.4'},
'yanis_b':{name:'Yanis Benali',priv:false,them:true,me:'accepted',fw:['max.dubois','lucas.m','hugo.p','amelie.b'],lib:'sinners:w,obaa:w,hailmary:w,dune2:w,dune3:t,severance:d,shogun:d,andor:d,dandadan:c3.1,jjk:d,solo:d,kaiju:d'},
'camille.r':{name:'Camille Roy',priv:true,them:false,me:'accepted',fw:['lea.m','sarah.l'],lib:'anat:w,monte:w,opp:w,odyssey:t,bear:d,whitelotus:d,pitt:c1.12,tlou:a'},
'theo.g':{name:'Théo Gagnon',priv:false,them:true,me:'accepted',fw:['max.dubois','lucas.m'],lib:'superman:w,f1:w,spider:w,avengers:t,stranger:d,tlou:c2.5,dandadan:d,spy:d'},
'ines.t':{name:'Inès Tremblay',priv:false,them:true,me:null,fw:['lea.m','nora.k','hugo.p'],lib:'dune2:w,opp:w,hailmary:w,wicked2:t,frieren:d,dandadan:c3.2,bear:c4.2,severance:d,slow:d'},
'hugo.p':{name:'Hugo Pelletier',priv:false,them:false,me:null,fw:['zoe.l','lucas.m','max.dubois'],lib:'odyssey:w,dune2:w,opp:w,anat:w,sinners:w,obaa:w,bear:d,severance:d,shogun:d,tlou:d,frieren:d,slow:d,andor:d'},
'nora.k':{name:'Nora Khalil',priv:false,them:true,me:null,fw:['sarah.l','lea.m','zoe.l'],lib:'odyssey:w,dune2:w,monte:w,anat:w,kpop:w,whitelotus:d,adolescence:d,frieren:c2.8,spy:d,bear:c4.1'},
'julien.c':{name:'Julien Côté',priv:true,them:false,me:null,fw:['max.dubois'],lib:'opp:w,dune2:w,f1:w,odyssey:w,stranger:d'},
'amelie.b':{name:'Amélie Bouchard',priv:false,them:false,me:null,fw:['yanis_b','zoe.l'],lib:'odyssey:w,opp:w,dune2:w,wicked2:w,kpop:w,severance:c2.4,slow:d,andor:c2.6,jjk:d'},
'lucas.m':{name:'Lucas Morin',priv:false,them:false,me:null,fw:['max.dubois','theo.g','hugo.p'],lib:'odyssey:w,dune2:w,opp:w,sinners:w,f1:w,tlou:d,stranger:d,solo:d,dandadan:d,jjk:c3.4,kaiju:d'},
'zoe.l':{name:'Zoé Lavoie',priv:false,them:false,me:null,fw:['hugo.p','nora.k','sarah.l'],lib:'odyssey:w,anat:w,dune2:w,opp:w,bear:d,whitelotus:d,frieren:d,severance:d'},
'emma.d':{name:'Emma Dupuis',priv:false,them:false,me:null,fw:['chloe.v'],lib:'kpop:w,wicked2:w,spy:c3.2'},
'karim.a':{name:'Karim Aziz',priv:false,them:false,me:null,fw:['lucas.m'],lib:'f1:w,superman:w,solo:d'},
'chloe.v':{name:'Chloé Vachon',priv:false,them:false,me:null,fw:['emma.d','sarah.l'],lib:'monte:w,anat:w,adolescence:d'}};
const LIB={};
Object.entries(U).forEach(([u,x])=>{const L={};x.lib.split(',').forEach(p=>{const [id,code]=p.split(':');const o={st:code[0],at:-((hash(u+id)%60)+1)};if(o.st==='c'){const se=code.slice(1).split('.').map(Number);o.s=se[0];o.e=se[1];}L[id]=o;});LIB[u]=L;});
const RESERVED=new Set(['admin','zabava','support','login','search','title','person','genre','settings','onboarding','discover','upcoming','profile','watchlist','feed','me']);
const TAKEN=new Set([...Object.keys(U),'dim','dimitri','lea','max','sarah']);
const ACT=[['lea.m','eps','bear',{s:4,e:5},0,'21:40'],['hugo.p','movie','odyssey',null,0,'20:55'],['max.dubois','movie','odyssey',null,0,'20:15'],['yanis_b','start','dandadan',null,0,'18:02'],['sarah.l','add','hailmary',null,0,'12:30'],['lea.m','follow',null,{target:'ines.t'},0,'10:05'],['theo.g','eps','tlou',{n:5},-1,'23:10'],['nora.k','eps','frieren',{s:2,e:8},-1,'22:30'],['max.dubois','finish','stranger',null,-1,'22:00'],['amelie.b','movie','odyssey',null,-1,'21:10'],['camille.r','movie','anat',null,-1,'19:45'],['yanis_b','add','dune3',null,-1,'14:20'],['lucas.m','finish','solo',null,-2,'23:00'],['lea.m','movie','kpop',null,-2,'21:00'],['sarah.l','eps','frieren',{s:2,e:4},-2,'20:30'],['theo.g','finish','spy',null,-2,'17:10'],['max.dubois','add','avengers',null,-3,'13:00'],['yanis_b','finish','severance',null,-3,'11:45'],['camille.r','follow',null,{target:'lea.m'},-4,'16:40'],['lea.m','start','pitt',null,-4,'09:15']].map((a,i)=>({i,u:a[0],type:a[1],id:a[2],x:a[3]||{},day:a[4],hm:a[5]}));
const clean=v=>norm(v).replace(/[^a-z0-9._]/g,'').slice(0,20);
const suggest=v=>{const b=(v.replace(/[._]+$/,'')||'membre').slice(0,15);return [b+'.tv',b+'_26',b+'.zab',b+'2',b+'.film'].filter(x=>!TAKEN.has(x)&&!RESERVED.has(x)).slice(0,3);};
const qrCache={};

function init(){const rel={};Object.entries(U).forEach(([u,x])=>rel[u]={me:x.me,them:x.them,blocked:false});
  return {me:{u:'dim.k',name:'Dim',priv:false},rel,requests:['emma.d','karim.a','chloe.v'],visited:[],uChk:{v:'dim.k',st:'ok',sugg:[]},pTab:'movie',pSeg:'watched',pSSeg:'c',socSheet:null,invite:false,scan:false,notifSoc:{followers:true,requests:true}};}

function make(c,A){
  const S=()=>c.state;
  const TBY={};window.APPDATA.T.forEach(t=>TBY[t.id]=t);
  const W=f=>e=>{if(e&&e.stopPropagation)e.stopPropagation();f();};
  A.isMeU=u=>u===S().me.u;
  A.relOf=u=>S().rel[u]||{me:null,them:false,blocked:false};
  A.setRel=(u,p)=>c.setState(s=>({rel:{...s.rel,[u]:{...(s.rel[u]||{me:null,them:false,blocked:false}),...p}}}));
  A.nameOf=u=>A.isMeU(u)?S().me.name:(U[u]?U[u].name:u);
  A.first=u=>A.nameOf(u).split(' ')[0];
  A.av=u=>A.isMeU(u)?{initial:S().me.name.charAt(0).toUpperCase(),bg:'var(--color-accent-800)'}:{initial:A.nameOf(u).charAt(0).toUpperCase(),bg:bgOf(u)};
  A.needNet=()=>{if(c.props.offline){A.toast('Connexion requise');return false;}return true;};
  A.follow=u=>{if(!A.needNet())return;const p=U[u].priv;A.setRel(u,{me:p?'pending':'accepted'});A.buzz();
    if(p){A.toast('Demande envoyée à @'+u);c._acc=c._acc||{};clearTimeout(c._acc[u]);c._acc[u]=setTimeout(()=>{if(A.relOf(u).me==='pending'){A.setRel(u,{me:'accepted'});A.toast(A.first(u)+' a accepté ta demande');}},6000);}};
  A.unfollow=u=>{if(!A.needNet())return;const prev=A.relOf(u).me;A.setRel(u,{me:null});A.toast('Tu ne suis plus @'+u,{fn:()=>A.setRel(u,{me:prev})});};
  A.fb=u=>{if(A.isMeU(u))return null;const r=A.relOf(u);
    if(r.blocked)return {label:'Débloquer',icon:'ph ph-prohibit',cls:'btn btn-secondary',tap:W(()=>A.unblock(u))};
    if(r.me==='accepted')return {label:'Abonné',icon:'ph ph-check',cls:'btn btn-secondary',tap:W(()=>c.setState({sheet:{title:'@'+u,opts:[{label:'Se désabonner',icon:'ph ph-user-minus',run:()=>A.unfollow(u)}]}}))};
    if(r.me==='pending')return {label:'Demandé',icon:'ph ph-clock',cls:'btn btn-secondary',tap:W(()=>{if(!A.needNet())return;A.setRel(u,{me:null});A.toast('Demande annulée');})};
    return {label:r.them?'Suivre en retour':'Suivre',icon:'ph ph-user-plus',cls:'btn btn-primary',tap:W(()=>A.follow(u))};};
  A.block=u=>{if(!A.needNet())return;c.setState({dlg:{title:'Bloquer @'+u+' ?',body:"Vous ne pourrez plus vous suivre et vous n'apparaîtrez plus dans vos recherches ni sur vos fiches. "+A.first(u)+" ne sera pas prévenu·e.",actions:[{label:'Annuler',cls:'btn btn-secondary',run:()=>{}},{label:'Bloquer',cls:'btn btn-primary',run:()=>{A.setRel(u,{me:null,them:false,blocked:true});A.toast('@'+u+' est bloqué·e');}}]}});};
  A.unblock=u=>{if(!A.needNet())return;A.setRel(u,{blocked:false});A.toast('@'+u+' est débloqué·e');};
  A.report=u=>c.setState({sheet:{title:'Signaler @'+u,opts:[['Pseudo ou avatar inapproprié','ph ph-warning'],["Usurpation d'identité",'ph ph-identification-card'],['Spam','ph ph-envelope-simple']].map(([l,ic])=>({label:l,icon:ic,run:()=>A.toast('Signalement envoyé, merci')}))}});
  A.removeFollower=u=>{if(!A.needNet())return;A.setRel(u,{them:false});A.toast('@'+u+' ne te suit plus',{fn:()=>A.setRel(u,{them:true})});};
  A.link=u=>'https://zabava.app/u/'+u;
  A.copyLink=u=>{try{navigator.clipboard&&navigator.clipboard.writeText(A.link(u)).catch(()=>{});}catch(e){}A.toast('Lien copié');};
  A.shareLink=()=>{const u=S().me.u,text='Suis-moi sur Zabava : '+A.link(u);if(navigator.share){navigator.share({text}).catch(()=>{});}else A.copyLink(u);};
  A.userMenu=u=>{const r=A.relOf(u);const o=[{label:'Partager le profil',icon:'ph ph-share-network',run:()=>A.copyLink(u)}];
    if(r.them&&!r.blocked)o.push({label:'Retirer de mes abonnés',icon:'ph ph-user-minus',run:()=>A.removeFollower(u)});
    o.push(r.blocked?{label:'Débloquer',icon:'ph ph-prohibit',run:()=>A.unblock(u)}:{label:'Bloquer',icon:'ph ph-prohibit',run:()=>A.block(u)});
    o.push({label:'Signaler',icon:'ph ph-flag',run:()=>A.report(u)});c.setState({sheet:{title:'@'+u,opts:o}});};
  A.openUser=u=>{if(A.isMeU(u)){c.setState({tab:'profile',stack:[],sheet:null,socSheet:null,invite:false,scan:false});return;}
    c.setState(s=>({visited:[u,...s.visited.filter(x=>x!==u)].slice(0,5),socSheet:null,invite:false,scan:false}));A.push({kind:'user',u,tab:'movie',seg:'watched',sseg:'c'});};
  A.openFollows=(u,tab)=>A.push({kind:'follows',u,tab,q:''});
  A.openEdit=()=>{const m=S().me;c.setState({uChk:{v:m.u,st:'current',sugg:[]}});A.push({kind:'editProfile',u:m.u,name:m.name,priv:m.priv});};
  A.openMembers=()=>{const s=S(),top=s.stack[s.stack.length-1];if(!top||top.kind!=='search'){if(c.props.offline){A.toast('Recherche indisponible hors ligne');return;}A.openSearch();}c.setState({q:'@',qLive:'@',sTab:'members',advMode:false,invite:false});};
  A.setPriv=val=>{const s=S();
    if(s.me.priv&&!val&&s.requests.length){const n=s.requests.length;c.setState(st=>{const rel={...st.rel};st.requests.forEach(u=>rel[u]={...rel[u],them:true});return {rel,requests:[],me:{...st.me,priv:false}};});A.toast(n+(n>1?' demandes acceptées automatiquement':' demande acceptée automatiquement'));return;}
    c.setState(st=>({me:{...st.me,priv:val}}));
    if(val&&!s.requests.length){clearTimeout(c._rq);c._rq=setTimeout(()=>{const add=['emma.d','karim.a','chloe.v'].filter(u=>!A.relOf(u).them&&!A.relOf(u).blocked);if(add.length&&S().me.priv){c.setState({requests:add});A.toast(add.length+" nouvelles demandes d'abonnement");}},1500);}};
  A.acceptReq=u=>{if(!A.needNet())return;A.setRel(u,{them:true});c.setState(s=>({requests:s.requests.filter(x=>x!==u)}));A.toast(A.first(u)+' te suit maintenant');};
  A.declineReq=u=>c.setState(s=>({requests:s.requests.filter(x=>x!==u)}));
  A.acceptAll=()=>{if(!A.needNet())return;const n=S().requests.length;c.setState(st=>{const rel={...st.rel};st.requests.forEach(u=>rel[u]={...rel[u],them:true});return {rel,requests:[]};});A.toast(n+' demandes acceptées');};
  A.uCheck=(v,cur)=>{clearTimeout(c._uT);if(cur&&v===cur){c.setState({uChk:{v,st:'current',sugg:[]}});return;}
    c.setState({uChk:{v,st:'checking',sugg:[]}});
    c._uT=setTimeout(()=>{let r;if(c.props.offline)r={v,st:'offline',sugg:[]};else if(!/^[a-z0-9._]{3,20}$/.test(v))r={v,st:'invalid',sugg:[]};else if(TAKEN.has(v)||RESERVED.has(v))r={v,st:'taken',sugg:suggest(v)};else r={v,st:'ok',sugg:[]};c.setState(s=>s.uChk.v===v?{uChk:r}:null);},300);};
  A.uField=(set,cur)=>{const k=S().uChk;return {val:k.v,onU:e=>{const v=clean(e.target.value);set(v);A.uCheck(v,cur);},checking:k.st==='checking',ok:k.st==='ok',taken:k.st==='taken',invalid:k.st==='invalid',offline:k.st==='offline',
    border:k.st==='ok'?'var(--color-accent)':k.st==='taken'?'var(--color-neutral-400)':'var(--color-divider)',sugg:k.sugg.map(x=>({label:'@'+x,pick:()=>{set(x);A.uCheck(x,cur);}}))};};
  A.lib=u=>LIB[u]||{};
  A.mySet=()=>{const s=S(),set=new Set();window.APPDATA.T.forEach(t=>{const m=s.my[t.id];if(!m)return;if(t.type==='movie'){if(m.status==='watched')set.add(t.id);}else if(m.status!=='abandoned'&&A.sInfo(t).w>0)set.add(t.id);});return set;};
  A.common=u=>{if(A.isMeU(u))return 0;const mine=A._mine||A.mySet(),L=A.lib(u);let n=0;for(const id in L){const x=L[id];if((x.st==='w'||x.st==='c'||x.st==='d')&&mine.has(id))n++;}return n;};
  A.followersOf=u=>{if(A.isMeU(u))return Object.keys(U).filter(x=>A.relOf(x).them&&!A.relOf(x).blocked);const l=Object.keys(U).filter(x=>x!==u&&U[x].fw.includes(u)&&!A.relOf(x).blocked);if(A.relOf(u).me==='accepted')l.unshift(S().me.u);return l;};
  A.followingOf=u=>{if(A.isMeU(u))return Object.keys(U).filter(x=>A.relOf(x).me==='accepted'&&!A.relOf(x).blocked);const l=U[u].fw.filter(x=>!A.relOf(x).blocked);if(A.relOf(u).them)l.unshift(S().me.u);return l;};
  A.memberRow=(u,o={})=>{const cm=A.common(u),fb=A.fb(u);return {...A.av(u),name:A.nameOf(u),sub:'@'+u+(cm>=3?' · '+cm+' titres en commun':''),open:()=>A.openUser(u),hasFollow:!!fb,follow:fb||EMPTYFB,hasMore:!!o.more,more:o.more?W(o.more):()=>{}};};
  A.profVM=(u,view)=>{const s=S(),isMe=A.isMeU(u),r=isMe?{me:null,them:false,blocked:false}:A.relOf(u),priv=isMe?s.me.priv:U[u].priv;
    const blocked=!isMe&&r.blocked,locked=!isMe&&!blocked&&priv&&r.me!=='accepted';
    const fl=A.followersOf(u),fg=A.followingOf(u),cm=A.common(u);
    const guard=f=>()=>{if(locked){A.toast('Ce profil est privé');return;}if(blocked){A.toast('Tu as bloqué ce profil');return;}f();};
    const p={...A.av(u),name:A.nameOf(u),handle:'@'+u,lock:priv,followsMe:!isMe&&r.them&&!blocked,fc:String(fl.length),fcLabel:fl.length>1?'abonnés':'abonné',gc:String(fg.length),gcLabel:fg.length>1?'abonnements':'abonnement',
      openFollowers:guard(()=>A.openFollows(u,'followers')),openFollowing:guard(()=>A.openFollows(u,'following')),hasCommon:cm>=3,commonText:cm+' titres en commun',fb:isMe?EMPTYFB:(A.fb(u)||EMPTYFB),
      showLocked:locked,lockText:'Suis @'+u+' pour voir ses listes',showBlocked:blocked,showContent:!locked&&!blocked};
    p.tabs=[['movie','Films'],['tv','Séries'],['anime','Animés']].map(([k,l])=>TAB(l,view.tab===k,()=>view.setTab(k)));
    const isF=view.tab==='movie',so=isF?[['towatch','À voir'],['watched','Vus']]:[['c','En cours'],['d','Terminées'],['t','À voir']],cur=isF?view.seg:view.sseg;
    p.segName='pseg-'+u+'-'+view.tab;p.segOpts=so.map(([k,l])=>({label:l,on:cur===k,select:()=>isF?view.setSeg(k):view.setSSeg(k)}));
    const T=window.APPDATA.T,items=[];
    if(isF){if(isMe)T.filter(t=>t.type==='movie'&&s.my[t.id]&&s.my[t.id].status===cur).sort((a,b)=>(s.my[b.id].added||0)-(s.my[a.id].added||0)).forEach(t=>items.push({t}));
      else{const L=A.lib(u);T.filter(t=>t.type==='movie'&&L[t.id]&&L[t.id].st===(cur==='watched'?'w':'t')).forEach(t=>items.push({t}));}}
    else if(isMe){const MAP={watch:'c',stale:'c',uptodate:'c',done:'d',notstarted:'t'};T.filter(t=>t.type===view.tab&&s.my[t.id]).forEach(t=>{if(MAP[A.sec(t)]!==cur)return;let prog=null;if(cur==='c'){const i=A.sInfo(t),lw=[...i.aired].reverse().find(x=>A.isW(t.id,x.s,x.e));if(lw)prog={code:'S'+pad(lw.s)+' E'+pad(lw.e),pct:Math.round(i.w/Math.max(1,i.aired.length)*100)};}items.push({t,prog});});}
    else{const L=A.lib(u);T.filter(t=>t.type===view.tab&&L[t.id]&&L[t.id].st===cur).forEach(t=>{const x=L[t.id];let prog=null;if(cur==='c'){const aired=t.seasons.reduce((a,b)=>a+b[1],0);let idx=0;t.seasons.forEach((ss,i)=>{if(i+1<x.s)idx+=ss[1];else if(i+1===x.s)idx+=Math.min(x.e,ss[1]);});prog={code:'S'+pad(x.s)+' E'+pad(x.e),pct:Math.round(idx/Math.max(1,aired)*100)};}items.push({t,prog});});}
    p.grid=items.map(({t,prog})=>({poster:A.pv(t,{badge:false}),hasProg:!!prog,code:prog?prog.code:'',pct:prog?prog.pct+'%':'0%'}));p.gridHas=p.grid.length>0;p.gridEmpty=!p.gridHas;return p;};
  A.actVM=a=>{const s=S(),t=a.id?TBY[a.id]:null;
    const o={...A.av(a.u),name:A.first(a.u),openUser:W(()=>A.openUser(a.u)),mid:'',title:t?t.title:'',tail:'',time:hm(a.hm),when:a.day===0?hm(a.hm):a.day===-1?'Hier':fShort(a.day),isPoster:true,isStill:false,isUser:false,posterBg:t?bgOf(t.id):'',stillBg:'',tInitial:'',tBg:'',inMine:!!(t&&s.my[t.id]),openRight:W(()=>t?A.open(t.id):A.openUser(a.x.target)),day:a.day};
    if(a.type==='add'){o.mid='a ajouté';o.tail=' à sa liste';}
    else if(a.type==='movie')o.mid='a vu';else if(a.type==='start')o.mid='a commencé';else if(a.type==='finish')o.mid='a terminé';
    else if(a.type==='eps'){if(a.x.n>1)o.mid='a vu '+a.x.n+' épisodes de';else{const masked=s.spoiler&&!A.isW(t.id,a.x.s,a.x.e);o.mid='a vu S'+pad(a.x.s)+' E'+pad(a.x.e)+(masked?'':' « '+A.epTitle(t,a.x.s,a.x.e)+' »')+' de';if(!masked){o.isPoster=false;o.isStill=true;o.stillBg=bgOf(t.id+a.x.s+'-'+a.x.e);}}}
    else if(a.type==='follow'){const tg=a.x.target,av=A.av(tg);o.mid='suit maintenant';o.title=A.first(tg);o.isPoster=false;o.isUser=true;o.tInitial=av.initial;o.tBg=av.bg;}
    return o;};
  A.feed=()=>ACT.filter(a=>{const r=A.relOf(a.u);return r.me==='accepted'&&!r.blocked&&!(a.x.target&&A.relOf(a.x.target).blocked);}).sort((a,b)=>b.day-a.day||b.hm.localeCompare(a.hm)).map(A.actVM);
  A.titleSoc=id=>{const t=TBY[id];if(!t)return {};
    const fol=Object.keys(U).filter(u=>A.relOf(u).me==='accepted'&&!A.relOf(u).blocked&&A.lib(u)[id]);
    const names=fol.map(A.first),n=names.length;
    const text=n===1?names[0]:n===2?names[0]+' et '+names[1]:n===3?names[0]+', '+names[1]+' et '+names[2]:names[0]+', '+names[1]+' et '+(n-2)+' autres';
    const saw=Object.keys(U).filter(u=>{const r=A.relOf(u);if(U[u].priv||r.blocked||r.me)return false;const x=A.lib(u)[id];return x&&(x.st==='w'||x.st==='c'||x.st==='d');}).map(u=>({u,cm:A.common(u)})).sort((a,b)=>b.cm-a.cm).slice(0,10);
    return {hasF:n>0,stack:fol.slice(0,5).map(A.av),text,openSheet:()=>c.setState({socSheet:id}),hasSaw:saw.length>=3,
      saw:saw.map(({u,cm})=>({...A.av(u),handle:'@'+u,common:cm===0?'Aucun titre en commun':cm===1?'1 titre en commun':cm+' titres en commun',open:()=>A.openUser(u),follow:A.fb(u)||EMPTYFB}))};};
  A.socStatus=(u,id)=>{const t=TBY[id],x=A.lib(u)[id];if(t.type==='movie')return x.st==='w'?'Vu le '+fShort(x.at):'Dans sa liste';return x.st==='c'?'En cours · S'+pad(x.s)+' E'+pad(x.e):x.st==='d'?'Terminée':x.st==='a'?'Abandonnée':'Dans sa liste';};
  A.qr=txt=>{if(qrCache[txt])return qrCache[txt];if(!window.qrcode)return '';try{const q=window.qrcode(0,'H');q.addData(txt);q.make();const n=q.getModuleCount();let d='';for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(q.isDark(r,col))d+='M'+col+' '+r+'h1v1h-1z';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 '+(n+4)+' '+(n+4)+'" shape-rendering="crispEdges"><rect x="-2" y="-2" width="'+(n+4)+'" height="'+(n+4)+'" fill="#161826"/><path d="'+d+'" fill="#e9e9ed"/></svg>';
    qrCache[txt]='data:image/svg+xml;utf8,'+encodeURIComponent(svg);return qrCache[txt];}catch(e){return '';}};
}

function vals(c,A,v){
  const s=c.state,top=s.stack[s.stack.length-1],k=top&&top.kind;
  A._mine=A.mySet();
  v.meInitial=s.me.name.charAt(0).toUpperCase();v.meName=s.me.name;v.myHandle='@'+s.me.u;v.myLinkShort='zabava.app/u/'+s.me.u;
  // onboarding (4 étapes, pseudo en premier)
  const st=s.onbStep,okU=s.uChk.st==='ok';
  v.onbSteps=[0,1,2,3].map(i=>({bg:i<=st?'var(--color-accent)':'var(--color-neutral-800)'}));
  v.onb0=st===0;v.onb1=st===1;v.onb2=st===2;v.onb3=st===3;v.hasOnbBack=st>0;v.showSkip=st>0;
  v.onbNextOpacity=st===0&&!okU?'.45':'1';v.onbNextPe=st===0&&!okU?'none':'auto';v.onbNextLabel=st===3?'Terminer':'Continuer';
  v.onbNext=()=>{if(st===0){if(c.state.uChk.st!=='ok')return;c.setState(x=>({me:{...x.me,u:x.uChk.v},onbStep:1}));return;}if(st<3)c.setState({onbStep:st+1});else c.setState({route:'notif'});};
  v.onbBack=()=>c.setState({onbStep:Math.max(0,st-1)});
  v.uf=A.uField(()=>{},null);v.onbPrivSw=SW('Profil privé',s.me.priv,()=>c.setState(x=>({me:{...x.me,priv:!x.me.priv}})));
  // mon profil
  v.mp=A.profVM(s.me.u,{tab:s.pTab,seg:s.pSeg,sseg:s.pSSeg,setTab:x=>c.setState({pTab:x}),setSeg:x=>c.setState({pSeg:x}),setSSeg:x=>c.setState({pSSeg:x})});
  v.mpHasReq=s.me.priv&&s.requests.length>0;v.mpReqCount=String(s.requests.length);
  v.openInvite=()=>c.setState({invite:true});v.openSettings=()=>A.push({kind:'settings'});v.openEdit=()=>A.openEdit();v.openRequests=()=>A.push({kind:'requests'});v.openBlocked=()=>A.push({kind:'blocked'});v.openFeed=()=>A.push({kind:'feed'});v.openMembers=()=>A.openMembers();
  v.ovUser=k==='user';v.ovFollows=k==='follows';v.ovFeed=k==='feed';v.ovRequests=k==='requests';v.ovBlocked=k==='blocked';v.ovSettings=k==='settings';v.ovEdit=k==='editProfile';
  v.op={};v.fl={};v.ed={};v.ts={};
  if(v.ovUser){v.op=A.profVM(top.u,{tab:top.tab,seg:top.seg,sseg:top.sseg,setTab:x=>A.patchTop({tab:x}),setSeg:x=>A.patchTop({seg:x}),setSSeg:x=>A.patchTop({sseg:x})});v.opMenu=()=>A.userMenu(top.u);}
  if(v.ovFollows){const u=top.u,isMe=A.isMeU(u),fol=top.tab==='followers';let list=fol?A.followersOf(u):A.followingOf(u);const q=norm(top.q.trim());if(q)list=list.filter(x=>norm(x).includes(q)||norm(A.nameOf(x)).includes(q));
    v.fl={title:A.nameOf(u),tabs:[TAB('Abonnés',fol,()=>A.patchTop({tab:'followers'})),TAB('Abonnements',!fol,()=>A.patchTop({tab:'following'}))],q:top.q,onQ:e=>A.patchTop({q:e.target.value}),
      rows:list.map(x=>A.memberRow(x,{more:isMe&&fol?()=>c.setState({sheet:{title:'@'+x,opts:[{label:'Retirer cet abonné',icon:'ph ph-user-minus',run:()=>A.removeFollower(x)}]}}):null})),empty:!list.length,
      emptyTitle:q?'Aucun membre ne correspond':isMe?(fol?'Personne ne te suit encore':"Tu ne suis personne pour l'instant"):"Rien ici pour l'instant",hasCta:!q&&isMe,ctaLabel:fol?'Inviter':'Trouver des membres',cta:fol?()=>c.setState({invite:true}):()=>A.openMembers()};}
  // fil d'activité
  const feed=A.feed();const days=[...new Set(feed.map(a=>a.day))];
  v.feedGroups=days.map(d=>({label:dayLabel(d),items:feed.filter(a=>a.day===d)}));v.feedHas=feed.length>0;v.feedEmpty=!feed.length;
  v.actCards=feed.slice(0,6);v.hasActCards=feed.length>0;
  // fiche titre
  if(v.ovTitle)v.ts=A.titleSoc(top.id);
  v.socOpen=!!s.socSheet;v.socRows=[];v.socTitle='';v.closeSoc=()=>c.setState({socSheet:null});
  if(s.socSheet){const id=s.socSheet,t=window.APPDATA.T.find(x=>x.id===id);v.socTitle=t?t.title:'';v.socRows=Object.keys(U).filter(u=>A.relOf(u).me==='accepted'&&!A.relOf(u).blocked&&A.lib(u)[id]).map(u=>({...A.av(u),name:A.nameOf(u),status:A.socStatus(u,id),open:()=>A.openUser(u)}));}
  // inviter / scanner
  v.inviteOpen=s.invite;v.qr=A.qr(A.link(s.me.u));v.hasQr=!!v.qr;v.noQr=!v.qr;v.closeInvite=()=>c.setState({invite:false});v.shareLink=()=>A.shareLink();v.copyMyLink=()=>A.copyLink(s.me.u);
  v.scanOpen=s.scan;v.openScan=()=>c.setState({scan:true});v.closeScan=()=>c.setState({scan:false});v.simulateScan=()=>{c.setState({scan:false,invite:false});A.openUser('nora.k');};
  // recherche : onglet Membres
  v.sTabs=[['all','Tout'],['movie','Films'],['tv','Séries'],['anime','Animés'],['person','Personnes'],['members','Membres']].map(([x,l])=>TAB(l,s.sTab===x,()=>c.setState({sTab:x})));
  v.onQ=e=>{const q=e.target.value,p={q};if(q.startsWith('@')&&c.state.sTab!=='members')p.sTab='members';c.setState(p);clearTimeout(c._qT);c._qT=setTimeout(()=>c.setState({qLive:q}),300);};
  v.openMembersInSearch=()=>c.setState({q:'@',qLive:'@',sTab:'members'});
  v.isMembers=v.qHas&&s.sTab==='members';v.mShow=false;v.mNone=false;v.mShortShow=false;v.mResults=[];v.mVisited=[];v.mHasVisited=false;v.mNoVisited=false;
  if(v.isMembers){v.sShow=false;v.sNone=false;const q=norm(s.qLive.trim().replace(/^@/,''));
    if(q.length<2){v.mShortShow=!v.sPending;v.mVisited=s.visited.filter(u=>!A.relOf(u).blocked).map(u=>A.memberRow(u));v.mHasVisited=v.mVisited.length>0;v.mNoVisited=!v.mHasVisited;}
    else{const fol=Object.keys(U).filter(x=>A.relOf(x).me==='accepted');const r=Object.keys(U).filter(x=>!A.relOf(x).blocked&&(norm(x).startsWith(q)||norm(U[x].name).startsWith(q)||norm(U[x].name).split(/\s+/).some(w=>w.startsWith(q))))
        .map(x=>({x,sc:norm(x)===q?1000:fol.filter(f=>U[f].fw.includes(x)).length})).sort((a,b)=>b.sc-a.sc).map(o=>A.memberRow(o.x));
      v.mResults=r;v.mShow=!v.sPending&&r.length>0;v.mNone=!v.sPending&&!r.length;}}
  // réglages
  v.privSw=SW('Profil privé',s.me.priv,()=>A.setPriv(!s.me.priv));
  v.socNotif=[['followers','Nouvel abonné'],['requests',"Demandes d'abonnement"]].map(([x,l])=>SW(l,s.notifSoc[x],()=>c.setState(st2=>({notifSoc:{...st2.notifSoc,[x]:!st2.notifSoc[x]}}))));
  const bl=Object.keys(U).filter(u=>A.relOf(u).blocked);v.blockedLabel=bl.length?String(bl.length):'Aucun';
  v.blockedRows=bl.map(u=>({...A.av(u),name:A.nameOf(u),handle:'@'+u,unblock:()=>A.unblock(u)}));v.blockedHas=bl.length>0;v.blockedEmpty=!bl.length;
  // demandes
  v.reqRows=s.requests.map(u=>({...A.av(u),name:A.nameOf(u),handle:'@'+u,open:()=>A.openUser(u),accept:()=>A.acceptReq(u),decline:()=>A.declineReq(u)}));v.reqHas=s.requests.length>0;v.reqEmpty=!v.reqHas;v.reqAll=s.requests.length>=2;v.reqCountLabel=s.requests.length+' demandes';v.acceptAll=()=>A.acceptAll();
  // modifier le profil
  if(v.ovEdit){const ck=s.uChk,valid=top.u===s.me.u||ck.st==='ok'||ck.st==='current';
    v.ed={uf:A.uField(x=>A.patchTop({u:x}),s.me.u),name:top.name,onName:e=>A.patchTop({name:e.target.value}),privSw:SW('Profil privé',top.priv,()=>A.patchTop({priv:!top.priv})),
      saveOpacity:valid?'1':'.45',savePe:valid?'auto':'none',photo:()=>c.setState({sheet:{title:'Photo de profil',opts:[{label:'Photo de mon compte Apple',icon:'ph ph-apple-logo',run:()=>A.toast('Photo du compte utilisée')},{label:'Choisir dans la bibliothèque',icon:'ph ph-image',run:()=>A.toast('Ouverture de la photothèque…')}]}}),
      save:()=>{if(!valid)return;const t2=c.state.stack[c.state.stack.length-1];c.setState(x=>({me:{...x.me,u:t2.u,name:(t2.name||'').trim()||x.me.name}}));if(t2.priv!==c.state.me.priv)A.setPriv(t2.priv);A.back();A.toast('Profil mis à jour');}};}
}
window.SOCIAL={init,make,vals};
})();
