function $(id){return document.getElementById(id);}
function safeLSGet(k,d){try{const v=localStorage.getItem(k);return v!==null?v:d;}catch(e){return d;}}
function safeLSSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function safeLSRemove(k){try{localStorage.removeItem(k);}catch(e){}}
function toast(msg){const t=$("toast");t.textContent=msg;t.className="show";setTimeout(function(){t.className="";},2000);}
const R_ALL=[].concat(questionsD1,questionsD2,questionsD3,questionsD4,questionsD5,questionsD6,questionsD7);
const ALL=[];
for(let i=0;i<R_ALL.length;i++){const r=R_ALL[i];ALL.push({d:r[0],id:'d'+r[0]+'_'+r[1],q:[r[2],r[3]],o:[r[4],r[5]],c:r[6],e:[r[7],r[8]]});}
let examQs=[],answers=[],flags=[],curQ=0,timerID=null,timeLeft=0,examMode="",lastDomain=0,examActive=false;
let qTimes=[],qStartTime=0,currentStreak=0,bestStreak=0;
let optOrder=[];
let flashQs=[],flashIdx=0,flashFlipped=false;
function genOptOrder(n){
 optOrder=[];
 for(let i=0;i<n;i++){
 const o=[0,1,2,3];
 for(let j=3;j>0;j--){const k=Math.floor(Math.random()*(j+1));let t=o[j];o[j]=o[k];o[k]=t;}
 optOrder.push(o);
 }
}
function getQStats(){return JSON.parse(safeLSGet("itilv5_qstats","{}"));}
function saveQStats(s){safeLSSet("itilv5_qstats",JSON.stringify(s));}
function updateQStat(qid,ok){
 const s=getQStats();
 if(!s[qid]) s[qid]={attempts:0,correct:0};
 s[qid].attempts++;
 if(ok) s[qid].correct++;
 s[qid].lastSeen=Date.now();
 saveQStats(s);
}
function autoSave(){
 if(!examActive) return;
 const st={examMode:examMode,examQIds:[],answers:answers,flags:flags,curQ:curQ,timeLeft:timeLeft,realMode:realMode,qTimes:qTimes,currentStreak:currentStreak,bestStreak:bestStreak,lastDomain:lastDomain,optOrder:optOrder};
 for(let i=0;i<examQs.length;i++) st.examQIds.push(examQs[i].id);
 safeLSSet("itilv5_autosave",JSON.stringify(st));
}
function clearAutoSave(){safeLSRemove("itilv5_autosave");}
function getAutoSave(){const s=safeLSGet("itilv5_autosave",null);if(!s)return null;try{return JSON.parse(s);}catch(e){return null;}}
function restoreExam(state){
 examMode=state.examMode;realMode=state.realMode||false;lastDomain=state.lastDomain||0;
 answers=state.answers;flags=state.flags;curQ=state.curQ;
 qTimes=state.qTimes||[];currentStreak=state.currentStreak||0;bestStreak=state.bestStreak||0;
 examQs=[];
 const idMap={};
 for(let i=0;i<ALL.length;i++) idMap[ALL[i].id]=ALL[i];
 for(let i=0;i<state.examQIds.length;i++){
 if(idMap[state.examQIds[i]]) examQs.push(idMap[state.examQIds[i]]);
 }
 if(examQs.length!==state.examQIds.length){clearAutoSave();return false;}
 optOrder=state.optOrder||[];
 if(optOrder.length!==examQs.length) genOptOrder(examQs.length);
 while(qTimes.length<examQs.length) qTimes.push(0);
 examActive=true;
 if(examMode==="sim"&&state.timeLeft>0){
 timeLeft=state.timeLeft;startTimer();
 $("timerDiv").style.display="block";
 } else {
 $("timerDiv").style.display="none";
 }
 let info="";
 if(examMode==="sim"){
 info=UI.simBtn[L]+" — "+examQs.length+" "+UI.qs[L].toLowerCase()+" / 60 "+UI.min[L];
 if(realMode) info+=' <span class="real-badge">PeopleCert Mode</span>';
 } else if(examMode==="domain"){
 const d=lastDomain,pct=Math.round((DCOUNTS[d]/ALL.length)*100);
 info=DICONS[d]+' <strong>'+DFULL[d][L]+'</strong> · ITIL v5 · '+UI.domLabel[L]+' '+(d+1)+' ('+pct+'%) · '+examQs.length+' '+UI.qsLabel[L]+'<div class="exam-topics">'+DTOPICS[d][L]+'</div>';
 } else if(examMode==="smart"){
 info=UI.smartInfo[L]+" — "+examQs.length+" "+UI.qs[L].toLowerCase();
 } else if(examMode==="adaptive"){
 info=UI.adaptInfo[L]+" — "+examQs.length+" "+UI.qs[L].toLowerCase();
 } else {
 info=UI.fullInfo[L]+" — "+examQs.length+" "+UI.qs[L].toLowerCase();
 }
 $("examInfo").innerHTML=info;
 updateBackBtn();renderShortcuts();qStartTime=Date.now();
 showView("exam");renderQ();renderGrid();renderExamCounter();
 clearAutoSave();return true;
}
function toggleTheme(){
 T=T===0?1:0;document.body.className=T===1?"light":"";
 $("navTheme").textContent=T===0?"☀️":"🌙";
 safeLSSet("itilv5_theme",""+T);
}
function toggleLang(){
 L=L===0?1:0;
 $("navLang").textContent=L===0?"🇪🇸":"🇬🇧";
 safeLSSet("itilv5_lang",""+L);
 document.documentElement.lang=L===0?"es":"en";
 refreshUI();
 if($("exam").classList.contains("active")&&examQs.length>0){renderQ();renderShortcuts();updateBackBtn();renderExamCounter();}
 if($("flashcards").classList.contains("active")&&flashQs.length>0) renderFlashCard();
 if($("results").classList.contains("active")&&examQs.length>0) showReview();
}
function refreshUI(){
 $("mainTitle").innerHTML=UI.title[L];
 $("navInfo").textContent=UI.info[L];
 $("navHome").textContent=UI.home[L];
 $("navHist").textContent=UI.hist[L];
 $("navTheme").textContent=T===0?"☀️":"🌙";
 $("btnSim").textContent=UI.simBtn[L];
 $("btnFull").textContent=UI.fullBtn[L]+" ("+ALL.length+" Qs)";
 $("btnDom").textContent=UI.domBtn[L];
 $("btnSmart").textContent=UI.smartBtn[L];
 $("btnFlash").textContent=UI.flashBtn[L];
 $("btnAdapt").textContent=UI.adaptBtn[L];
 $("btnPrev").textContent=UI.prev[L];
 $("btnNext").textContent=UI.next[L];
 $("btnFlag").textContent=UI.flag[L];
 $("btnFinish").textContent=UI.finish[L];
 $("btnBackHome").textContent=UI.backHome[L];
 $("btnReview").textContent=UI.review[L];
 $("histTitle").textContent=UI.histTitle[L];
 $("btnClearHist").textContent=UI.clearHist[L];
 $("btnResetStats").textContent=UI.resetStats[L];
 $("domTitle").textContent=UI.domTitle[L];
 $("btnBackDom").textContent=UI.backDom[L];
 $("summaryTitle").textContent=UI.summaryTitle[L];
 $("progressTitle").textContent=UI.progressTitle[L];
 $("btnFlashPrev").textContent=UI.prev[L];
 $("btnFlashNext").textContent=UI.next[L];
 $("btnBackFlash").textContent=UI.flashBack[L];
 $("globalFooter").innerHTML=UI.infoFooter[L].replace(/\\n/g,"<br>");
 renderSummary();renderDomainCards();renderSimLanding();renderInfo();
 if($("history").classList.contains("active")){renderHistory();renderProgress();}
 $("navTheme").title=T===0?(L===0?"Cambiar a modo claro":"Switch to light mode"):(L===0?"Cambiar a modo oscuro":"Switch to dark mode");
 $("navLang").title=L===0?"Switch to English":"Cambiar a Español";
}
function renderSummary(){
 const hist=JSON.parse(safeLSGet("itilv5_history","[]"));
 const exams=hist.length; let best=0;
 for(let i=0;i<hist.length;i++){if(hist[i].pct>best) best=hist[i].pct;}
 const items=[
 {icon:"🏆",num:exams,color:"var(--purple)",label:UI.examsDone[L]},
 {icon:"📊",num:best+"%",color:best>=65?"var(--green)":"var(--red)",label:UI.bestScore[L]}
 ];
 let h='<div class="sum-row">';
 for(let i=0;i<items.length;i++){
 const it=items[i];
 h+='<div class="sum-card" style="border-left:4px solid '+it.color+'">';
 h+='<div class="si">'+it.icon+'</div>';
 h+='<div><div class="sn" style="color:'+it.color+'">'+it.num+'</div>';
 h+='<div class="sl">'+it.label+'</div></div></div>';
 }
 h+='</div>';
 const tc={},tt={};
 for(let d=0;d<7;d++){tc[d]=0;tt[d]=0;}
 for(let i=0;i<hist.length;i++){
 const e=hist[i];
 if(e.dc&&e.dt){for(let d=0;d<7;d++){tc[d]+=(e.dc[d]||0);tt[d]+=(e.dt[d]||0);}}
 }
 let hasHist=false;
 for(let d=0;d<7;d++){if(tt[d]>0) hasHist=true;}
 const str=[],wk=[];
 if(hasHist){
 for(let d=0;d<7;d++){
 if(tt[d]===0) continue;
 const dp=Math.round((tc[d]/tt[d])*100);
 if(dp>=80) str.push({icon:DICONS[d],name:DN[d][L],pct:dp});
 else if(dp<65) wk.push({icon:DICONS[d],name:DN[d][L],pct:dp});
 }
 }
 h+='<div class="results-box" style="padding:18px">';
 if(!hasHist){
 h+='<h3 style="color:var(--muted);margin:0 0 8px">'+UI.strengths[L]+' / '+UI.improve[L]+'</h3>';
 h+='<div style="color:var(--muted);font-size:.9em">'+UI.noStrWk[L]+'</div>';
 } else if(str.length>0||wk.length>0){
 if(str.length>0){
 h+='<h3 style="color:var(--green);margin:0 0 8px">'+UI.strengths[L]+'</h3>';
 for(let i=0;i<str.length;i++) h+='<div style="margin:4px 0;font-size:.9em">'+str[i].icon+' '+str[i].name+' <span style="color:var(--green);font-weight:700">'+str[i].pct+'%</span></div>';
 }
 if(wk.length>0){
 if(str.length>0) h+='<div style="margin:12px 0 0"></div>';
 h+='<h3 style="color:var(--red);margin:0 0 8px">'+UI.improve[L]+'</h3>';
 for(let i=0;i<wk.length;i++) h+='<div style="margin:4px 0;font-size:.9em">'+wk[i].icon+' '+wk[i].name+' <span style="color:var(--red);font-weight:700">'+wk[i].pct+'%</span></div>';
 }
 } else {
 h+='<h3 style="color:var(--green);margin:0 0 8px">'+UI.strengths[L]+' / '+UI.improve[L]+'</h3>';
 h+='<div style="color:var(--green);font-size:.9em">✅ '+UI.planReady[L]+'</div>';
 }
 h+='</div>';
 h+='<div class="results-box" style="padding:18px">';
 h+='<h3 style="color:var(--blue);margin:0 0 10px">'+UI.planTitle[L]+'</h3>';
 if(!hasHist){
 h+='<div style="color:var(--muted);font-size:.9em">'+UI.planNoPractice[L]+'</div>';
 } else {
 const weakD=[],midD=[];
 for(let d=0;d<7;d++){
 if(tt[d]===0) continue;
 const dp=Math.round((tc[d]/tt[d])*100);
 if(dp<65) weakD.push({d:d,pct:dp});
 else if(dp<80) midD.push({d:d,pct:dp});
 }
 weakD.sort(function(a,b){return a.pct-b.pct;});
 midD.sort(function(a,b){return a.pct-b.pct;});
 if(weakD.length===0&&midD.length===0){
 h+='<div style="font-size:.95em;color:var(--green)">'+UI.planReady[L]+'</div>';
 } else {
 let step=1;
 for(let i=0;i<weakD.length;i++){
 const wd=weakD[i];
 h+='<div class="plan-step"><div class="plan-num">'+step+'</div>';
 h+='<div class="plan-txt">📚 '+UI.planStudy[L]+' <strong>'+DICONS[wd.d]+' '+DN[wd.d][L]+'</strong> <span style="color:var(--red)">('+wd.pct+'%)</span></div></div>';
 step++;
 }
 h+='<div class="plan-step"><div class="plan-num">'+step+'</div>';
 h+='<div class="plan-txt">'+UI.planSmart[L]+'</div></div>';
 step++;
 for(let i=0;i<midD.length;i++){
 const md=midD[i];
 h+='<div class="plan-step"><div class="plan-num">'+step+'</div>';
 h+='<div class="plan-txt">📚 '+UI.planReinforce[L]+' <strong>'+DICONS[md.d]+' '+DN[md.d][L]+'</strong> <span style="color:var(--orange)">('+md.pct+'%)</span></div></div>';
 step++;
 }
 h+='<div class="plan-step"><div class="plan-num">'+step+'</div>';
 h+='<div class="plan-txt">'+UI.planAdaptive[L]+'</div></div>';
 step++;
 h+='<div class="plan-step"><div class="plan-num">'+step+'</div>';
 h+='<div class="plan-txt">'+UI.planMock[L]+'</div></div>';
 }
 }
 h+='</div>';
 $("summaryCards").innerHTML=h;
}
function renderDomainCards(){
 let h="";
 for(let d=0;d<7;d++){
 const pct=Math.round((DCOUNTS[d]/ALL.length)*100);
 h+='<div class="dom-card" data-domain="'+d+'" style="border-left:4px solid '+DCOLORS[d]+'">';
 h+='<div class="di">'+DICONS[d]+'</div><div class="dd">';
 h+='<div class="dn">'+DFULL[d][L]+'</div>';
 h+='<div class="dm">ITIL v5 Foundation · '+UI.domLabel[L]+' '+(d+1)+' ('+pct+'%) · '+DCOUNTS[d]+' '+UI.qsLabel[L]+'</div>';
 h+='<div class="dt">'+DTOPICS[d][L]+'</div></div>';
 h+='<div class="dq" style="color:'+DCOLORS[d]+'">'+DCOUNTS[d]+'</div></div>';
 }
 $("domainCards").innerHTML=h;
}
function renderSimLanding(){
 $("slTitle").textContent=UI.slTitle[L];
 $("slDesc").textContent=UI.slDesc[L];
 $("slStart").textContent=UI.slStart[L];
 $("slBack").textContent=UI.slBack[L];
 $("slRealLabel").textContent=UI.slRealLabel[L];
 let h="";
 for(let d=0;d<7;d++){
 let w=Math.round((DSIM[d]/40)*100),pct=Math.round((DCOUNTS[d]/ALL.length)*100);
 h+='<div class="dom-card no-click" style="border-left:4px solid '+DCOLORS[d]+'">';
 h+='<div class="di">'+DICONS[d]+'</div><div class="dd">';
 h+='<div class="dn">'+DFULL[d][L]+'</div>';
 h+='<div class="dm">'+UI.domLabel[L]+' '+(d+1)+' ('+pct+'%) · '+UI.slCW[L]+': '+w+'% · '+DSIM[d]+' '+UI.qsLabel[L]+'</div>';
 h+='<div class="dt">'+DTOPICS[d][L]+'</div></div>';
 h+='<div class="dq" style="color:'+DCOLORS[d]+'">'+DSIM[d]+'</div></div>';
 }
 h+='<div class="results-box" style="text-align:center;padding:15px"><strong style="color:var(--blue)">'+UI.slTotal[L]+'</strong> · 40 '+UI.qsLabel[L]+' · 60 '+UI.min[L]+' · 65% '+UI.approval[L]+'</div>';
 $("slDomains").innerHTML=h;
}
function showSimLanding(){showView("simLanding");}
function launchSim(){realMode=$("chkReal").checked;startExam("sim");}
function renderInfo(){
 $("infoSub").textContent=UI.infoSub[L];
 const discEl=$("infoDisclaimer");
 if(discEl) discEl.innerHTML=(UI.infoDisclaimer&&UI.infoDisclaimer[L])?UI.infoDisclaimer[L].replace(/\\n/g,"<br>"):"";
 $("infoFeatTitle").textContent=UI.infoFeatTitle[L];
 let fh="";
 for(let i=0;i<FEATS.length;i++) fh+='<div class="feat-card"><strong>'+FEATS[i][L][0]+'</strong><br><span>'+FEATS[i][L][1]+'</span></div>';
 $("infoFeatList").innerHTML=fh;
 $("infoKeyTitle").textContent=UI.infoKeyTitle[L];
 $("infoKC1").textContent=UI.infoKC1[L];
 $("infoKC2").textContent=UI.infoKC2[L];
 let kh="";
 for(let i=0;i<KEYS.length;i++) kh+='<tr><td><code style="background:var(--bg3);padding:4px 8px;border-radius:4px">'+KEYS[i][L][0]+'</code></td><td>'+KEYS[i][L][1]+'</td></tr>';
 $("infoKB").innerHTML=kh;
}
function renderShortcuts(){
 const p=[];
 for(let i=0;i<KEYS.length;i++) p.push("<code style='background:var(--bg2);padding:2px 6px;border-radius:4px;font-size:.9em'>"+KEYS[i][L][0]+"</code> "+KEYS[i][L][1]);
 $("examShortcuts").innerHTML='<span class="shortcuts-bar">⌨️ '+p.join(" · ")+'</span>';
}
function renderExamCounter(){
 let ans=0,fl=0;
 for(let i=0;i<answers.length;i++){if(answers[i]!==-1)ans++;if(flags[i])fl++;}
 let t=ans+"/"+examQs.length+" "+UI.answered[L];
 if(fl>0) t+=" · "+fl+" 🚩";
 if(currentStreak>=3) t+=' <span class="streak-badge">🔥 '+currentStreak+'</span>';
 $("examCounter").innerHTML=t;
}
function updateBackBtn(){
 const btn=$("btnBackExam");
 const map={domain:UI.backExamDom,sim:UI.backExamSim,full:UI.backExamFull,smart:UI.backExamSmart,adaptive:UI.backExamAdapt};
 if(map[examMode]){btn.textContent=map[examMode][L];btn.style.display="";}
 else{btn.style.display="none";}
}
function backFromExam(){
 if(!confirm(UI.exitConfirm[L])) return;
 if(timerID){clearInterval(timerID);timerID=null;}
 examActive=false;clearAutoSave();
 if(examMode==="domain") showView("domains");
 else if(examMode==="sim") showView("simLanding");
 else showView("home");
}
function init(){
 DCOUNTS=[0,0,0,0,0,0,0];
 for(let i=0;i<ALL.length;i++) DCOUNTS[ALL[i].d]++;
 const simTotal=40; let assigned=0;
 DSIM=[0,0,0,0,0,0,0];
 for(let d=0;d<7;d++){DSIM[d]=Math.max(1,Math.round((DWEIGHT[d]/100)*simTotal));assigned+=DSIM[d];}
 while(assigned>simTotal){for(let d=6;d>=0&&assigned>simTotal;d--){if(DSIM[d]>1){DSIM[d]--;assigned--;}}}
 while(assigned<simTotal){for(let d=0;d<7&&assigned<simTotal;d++){DSIM[d]++;assigned++;}}
 let savedT=safeLSGet("itilv5_theme",null);
 if(savedT==="1"){T=1;document.body.className="light";}
 let savedL=safeLSGet("itilv5_lang",null);
 if(savedL!==null) L=parseInt(savedL);
 document.documentElement.lang=L===0?"es":"en";
 $("navLang").textContent=L===0?"🇪🇸":"🇬🇧";
 refreshUI();
 const saved=getAutoSave();
 if(saved&&saved.examQIds&&saved.examQIds.length>0){
 if(confirm(L===0?"Tienes un examen sin terminar. ¿Continuar?":"You have an unfinished exam. Continue?")){restoreExam(saved);}
 else{clearAutoSave();}
 }
}
function showView(v){
 const views=document.querySelectorAll(".view");
 for(let i=0;i<views.length;i++) views[i].className="view";
 $(v).className="view active";
 const ids=["navHome","navHist","navInfo"];
 let active=-1;
 if(v==="home"||v==="domains"||v==="simLanding") active=0;
 else if(v==="history") active=1;
 else if(v==="info") active=2;
 for(let i=0;i<ids.length;i++) $(ids[i]).className=i===active?"active":"";
 if(v==="history"){renderHistory();renderProgress();}
 if(v==="home") renderSummary();
 window.scrollTo(0,0);
}
function shuffle(a){
 const b=a.slice();
 for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));let t=b[i];b[i]=b[j];b[j]=t;}
 return b;
}
function initExamArrays(n){
 answers=[];flags=[];qTimes=[];
 for(let i=0;i<n;i++){answers.push(-1);flags.push(false);qTimes.push(0);}
 genOptOrder(n);
 curQ=0;qStartTime=Date.now();currentStreak=0;bestStreak=0;
}
function startExam(mode){
 examMode=mode;examQs=[];examActive=true;
 if(mode==="sim"){
 for(let d=0;d<7;d++){
 let pool=[];
 for(let i=0;i<ALL.length;i++){if(ALL[i].d===d) pool.push(ALL[i]);}
 pool=shuffle(pool);
 for(let j=0;j<DSIM[d]&&j<pool.length;j++) examQs.push(pool[j]);
 }
 examQs=shuffle(examQs);
 initExamArrays(examQs.length);
 timeLeft=3600;startTimer();
 $("timerDiv").style.display="block";
 } else {
 realMode=false;examQs=shuffle(ALL.slice());
 initExamArrays(examQs.length);
 $("timerDiv").style.display="none";
 }
 let info="";
 if(mode==="sim"){
 info=UI.simBtn[L]+" — "+examQs.length+" "+UI.qs[L].toLowerCase()+" / 60 "+UI.min[L];
 if(realMode) info+=' <span class="real-badge">PeopleCert Mode</span>';
 } else {info=UI.fullInfo[L]+" — "+examQs.length+" "+UI.qs[L].toLowerCase();}
 $("examInfo").innerHTML=info;
 updateBackBtn();renderShortcuts();
 showView("exam");renderQ();renderGrid();renderExamCounter();
}
function startDomain(d){
 examMode="domain";lastDomain=d;examActive=true;realMode=false;examQs=[];
 for(let i=0;i<ALL.length;i++){if(ALL[i].d===d) examQs.push(ALL[i]);}
 examQs=shuffle(examQs);
 initExamArrays(examQs.length);
 if(timerID){clearInterval(timerID);timerID=null;}
 $("timerDiv").style.display="none";
 const pct=Math.round((DCOUNTS[d]/ALL.length)*100);
 $("examInfo").innerHTML=DICONS[d]+' <strong>'+DFULL[d][L]+'</strong> · ITIL v5 · '+UI.domLabel[L]+' '+(d+1)+' ('+pct+'%) · '+examQs.length+' '+UI.qsLabel[L]+'<div class="exam-topics">'+DTOPICS[d][L]+'</div>';
 updateBackBtn();renderShortcuts();
 showView("exam");renderQ();renderGrid();renderExamCounter();
}
function startSmartReview(){
 const qs=getQStats(),weak=[];
 for(let i=0;i<ALL.length;i++){const s=qs[ALL[i].id];if(s&&s.attempts>0&&(s.correct/s.attempts)<0.65) weak.push(ALL[i]);}
 if(weak.length===0){toast(UI.noWeak[L]);return;}
 examMode="smart";examActive=true;realMode=false;
 examQs=shuffle(weak);
 initExamArrays(examQs.length);
 if(timerID){clearInterval(timerID);timerID=null;}
 $("timerDiv").style.display="none";
 $("examInfo").innerHTML="🧠 "+UI.smartInfo[L]+" — "+examQs.length+" "+UI.qs[L].toLowerCase();
 updateBackBtn();renderShortcuts();
 showView("exam");renderQ();renderGrid();renderExamCounter();
}
function startAdaptive(){
 const qs=getQStats();
 const dC=[0,0,0,0,0,0,0],dT=[0,0,0,0,0,0,0];
 for(let i=0;i<ALL.length;i++){const s=qs[ALL[i].id];if(s&&s.attempts>0){dT[ALL[i].d]++;dC[ALL[i].d]+=s.correct;}}
 const weights=[]; let totalW=0;
 for(let d=0;d<7;d++){
 let p=0.5;
 if(dT[d]>0) p=dC[d]/dT[d];
 weights[d]=Math.max(0.1,(1-p))*DCOUNTS[d];
 totalW+=weights[d];
 }
 const simTotal=40,dA=[0,0,0,0,0,0,0]; let assigned=0;
 for(let d=0;d<7;d++){dA[d]=Math.max(1,Math.round((weights[d]/totalW)*simTotal));assigned+=dA[d];}
 while(assigned>simTotal){for(let d=6;d>=0&&assigned>simTotal;d--){if(dA[d]>1){dA[d]--;assigned--;}}}
 while(assigned<simTotal){for(let d=0;d<7&&assigned<simTotal;d++){dA[d]++;assigned++;}}
 examMode="adaptive";examActive=true;realMode=false;examQs=[];
 for(let d=0;d<7;d++){
 const pool=[];
 for(let i=0;i<ALL.length;i++){if(ALL[i].d===d) pool.push(ALL[i]);}
 pool.sort(function(a,b){
 const sa=qs[a.id],sb=qs[b.id];
 let ra=0.5,rb=0.5;
 if(sa&&sa.attempts>0) ra=sa.correct/sa.attempts;
 if(sb&&sb.attempts>0) rb=sb.correct/sb.attempts;
 return ra-rb;
 });
 for(let j=0;j<dA[d]&&j<pool.length;j++) examQs.push(pool[j]);
 }
 examQs=shuffle(examQs);
 initExamArrays(examQs.length);
 if(timerID){clearInterval(timerID);timerID=null;}
 $("timerDiv").style.display="none";
 $("examInfo").innerHTML="🎯 "+UI.adaptInfo[L]+" — "+examQs.length+" "+UI.qs[L].toLowerCase();
 updateBackBtn();renderShortcuts();
 showView("exam");renderQ();renderGrid();renderExamCounter();
}
function startFlashcards(){
 flashQs=shuffle(ALL.slice());flashIdx=0;flashFlipped=false;
 $("flashInfo").innerHTML=UI.flashTitle[L]+" — "+flashQs.length+" "+UI.qs[L].toLowerCase();
 renderFlashCard();showView("flashcards");
}
function renderFlashCard(){
 const q=flashQs[flashIdx],letters=["A","B","C","D"];
 let h='<div style="font-size:1.15em;font-weight:600;margin-bottom:15px">'+q.q[L]+'</div>';
 if(flashFlipped){
 h+='<div class="flash-answer">✅ '+letters[q.c]+') '+q.o[L][q.c]+'</div>';
 h+='<div class="flash-explain">💡 '+q.e[L]+'</div>';
 } else {
 h+='<div style="color:var(--muted);font-size:.9em;margin-top:20px">'+UI.flashTap[L]+'</div>';
 }
 $("flashCard").innerHTML=h;
 $("flashCounter").textContent=(flashIdx+1)+" / "+flashQs.length;
}
function flipCard(){flashFlipped=!flashFlipped;renderFlashCard();}
function flashPrev(){if(flashIdx>0){flashIdx--;flashFlipped=false;renderFlashCard();}}
function flashNext(){if(flashIdx<flashQs.length-1){flashIdx++;flashFlipped=false;renderFlashCard();}}
function startTimer(){
 if(timerID) clearInterval(timerID);
 timerID=setInterval(function(){
 timeLeft--;
 if(timeLeft<=0){clearInterval(timerID);timerID=null;submitExam();}
 const m=Math.floor(timeLeft/60),s=timeLeft%60;
 $("timerDiv").textContent="⏱ "+pad(m)+":"+pad(s);
 $("timerDiv").style.color=timeLeft<300?"var(--red)":"var(--orange)";
 },1000);
}
function pad(n){return n<10?"0"+n:""+n;}
function renderQ(){
 const qObj=examQs[curQ],txt=qObj.q[L],opts=qObj.o[L],order=optOrder[curQ];
 const isScn=(txt.indexOf("ESCENARIO")===0||txt.indexOf("SCENARIO")===0);
 let qhtml=txt.replace(/\[\?\]/g,'<span class="missing-word">[?]</span>');
 qhtml=qhtml.replace(/\bNOT\b/g,'<span class="neg-word">NOT</span>');
 qhtml=qhtml.replace(/\bNO\b/g,'<span class="neg-word">NO</span>');
 if(isScn) qhtml='<span class="scenario">'+qhtml+'</span>';
 const answered=answers[curQ]!==-1,showFb=answered&&!realMode;
 let h='<div class="q-box"><div class="q-text">'+qhtml+'</div><div class="opts">';
 const letters=["A","B","C","D"];
 for(let i=0;i<4;i++){
 const origIdx=order[i];
 let cls="opt";
 if(answered&&realMode){if(origIdx===answers[curQ]) cls+=" selected";}
 else if(answered){
 if(origIdx===qObj.c) cls+=" correct";
 else if(origIdx===answers[curQ]&&origIdx!==qObj.c) cls+=" wrong";
 if(origIdx===answers[curQ]) cls+=" selected";
 }
 h+='<div class="'+cls+'" data-opt="'+i+'" tabindex="0"><span class="letter">'+letters[i]+'</span><span>'+opts[origIdx]+'</span></div>';
 }
 h+='</div>';
 if(showFb) h+='<div class="explanation">💡 '+qObj.e[L]+'</div>';
 h+='</div>';
 $("questionArea").innerHTML=h;
 $("qCounter").textContent=(curQ+1)+" / "+examQs.length;
 $("progBar").style.width=Math.round(((curQ+1)/examQs.length)*100)+"%";
 updateGrid();
}
function selectOpt(idx){
 if(answers[curQ]!==-1) return;
 const origIdx=optOrder[curQ][idx];
 qTimes[curQ]=Math.round((Date.now()-qStartTime)/1000);
 answers[curQ]=origIdx;
 const qObj=examQs[curQ],ok=origIdx===qObj.c;
 updateQStat(qObj.id,ok);
 if(ok){currentStreak++;if(currentStreak>bestStreak)bestStreak=currentStreak;}else{currentStreak=0;}
 renderQ();updateGrid();renderExamCounter();autoSave();qStartTime=Date.now();
}
function trackTime(){if(answers[curQ]===-1){qTimes[curQ]+=Math.round((Date.now()-qStartTime)/1000);}}
function prevQ(){if(curQ>0){trackTime();curQ--;qStartTime=Date.now();renderQ();}}
function nextQ(){if(curQ<examQs.length-1){trackTime();curQ++;qStartTime=Date.now();renderQ();}}
function goToQ(n){trackTime();curQ=n;qStartTime=Date.now();renderQ();}
function toggleFlag(){flags[curQ]=!flags[curQ];updateGrid();renderExamCounter();toast(flags[curQ]?"🚩":"✓");autoSave();}
function dotClass(i){
 let c="q-dot";
 if(i===curQ) c+=" current";
 if(answers[i]!==-1){
 if(realMode){c+=" answered";}
 else if(answers[i]===examQs[i].c){c+=" correct-dot";}
 else{c+=" wrong-dot";}
 }
 if(flags[i]) c+=" flagged";
 return c;
}
function renderGrid(){
 let h="";
 for(let i=0;i<examQs.length;i++){
 h+='<div class="'+dotClass(i)+'" data-q="'+i+'" tabindex="0">'+(i+1)+'</div>';
 }
 $("qGrid").innerHTML=h;
}
function updateGrid(){
 const dots=document.querySelectorAll(".q-dot");
 for(let i=0;i<dots.length;i++) dots[i].className=dotClass(i);
}
function calcScores(){
 let correct=0;
 const total=examQs.length,dc={},dt={};
 for(let d=0;d<7;d++){dc[d]=0;dt[d]=0;}
 for(let i=0;i<examQs.length;i++){const qObj=examQs[i];dt[qObj.d]++;if(answers[i]===qObj.c){correct++;dc[qObj.d]++;}}
 const pct=Math.round((correct/total)*100),pass=pct>=65;
 return {correct:correct,total:total,dc:dc,dt:dt,pct:pct,pass:pass};
}
function getModeStr(){
 if(examMode==="sim"&&realMode) return UI.realLabel[L];
 if(examMode==="sim") return UI.simMode[L];
 if(examMode==="full") return UI.fullMode[L];
 if(examMode==="smart") return UI.smartMode[L];
 if(examMode==="adaptive") return UI.adaptMode[L];
 return UI.domMode[L];
}
function calcTimeStats(){
 let totalTime=0,ac=0;
 for(let i=0;i<qTimes.length;i++){if(qTimes[i]>0){totalTime+=qTimes[i];ac++;}}
 return ac>0?Math.round(totalTime/ac):0;
}
function saveHistoryEntry(sc,modeStr,avgT){
 const hist=JSON.parse(safeLSGet("itilv5_history","[]"));
 const now=new Date();
 const entry={date:now.toLocaleDateString("es-CO")+" "+now.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}),mode:modeStr,total:sc.total,correct:sc.correct,pct:sc.pct,pass:sc.pass,dc:{},dt:{},avgTime:avgT,bestStreak:bestStreak};
 for(let d=0;d<7;d++){entry.dc[d]=sc.dc[d];entry.dt[d]=sc.dt[d];}
 hist.push(entry);safeLSSet("itilv5_history",JSON.stringify(hist));
}
function buildResultsHTML(sc,avgT){
 let pt=UI.fail[L];
 if(sc.pass) pt=UI.pass[L];
 let h='<div class="results-box"><h2 style="text-align:center">'+pt+'</h2>';
 h+='<div class="score-big '+(sc.pass?"pass":"fail")+'">'+sc.pct+'%</div>';
 h+='<p style="text-align:center;color:var(--muted);margin:10px 0">'+sc.correct+' '+UI.of[L]+' '+sc.total+' '+UI.correct[L]+' \u2014 '+UI.approval[L]+': 65%</p>';
 h+='<p style="text-align:center;color:var(--muted);font-size:.85em;margin:5px 0">'+UI.timeStats[L]+': '+avgT+' '+UI.secQ[L];
 if(bestStreak>=3) h+=' \u00b7 \uD83D\uDD25 '+bestStreak;
 h+='</p></div>';
 h+='<div class="results-box"><h2>'+UI.breakdown[L]+'</h2>';
 const str=[],wk=[];
 for(let d=0;d<7;d++){
 if(sc.dt[d]===0) continue;
 let dp=Math.round((sc.dc[d]/sc.dt[d])*100),col="var(--red)";
 if(dp>=80) col="var(--green)";else if(dp>=65) col="var(--orange)";
 h+='<div class="domain-bar"><div class="name">'+DICONS[d]+' '+DN[d][L].split(" ").slice(0,2).join(" ")+'</div>';
 h+='<div class="bar-bg"><div class="bar-fill" style="width:'+dp+'%;background:'+col+'"></div></div>';
 h+='<div class="pct" style="color:'+col+'">'+dp+'% ('+sc.dc[d]+'/'+sc.dt[d]+')</div></div>';
 if(dp>=80) str.push(DICONS[d]+" "+DN[d][L]);else if(dp<65) wk.push(DICONS[d]+" "+DN[d][L]);
 }
 h+='</div>';
 if(str.length>0||wk.length>0){
 h+='<div class="results-box">';
 if(str.length>0){h+='<h3 style="color:var(--green)">'+UI.strengths[L]+'</h3><ul>';for(let i=0;i<str.length;i++) h+='<li>'+str[i]+'</li>';h+='</ul>';}
 if(wk.length>0){h+='<h3 style="color:var(--red)">'+UI.improve[L]+'</h3><ul>';for(let i=0;i<wk.length;i++) h+='<li>'+wk[i]+'</li>';h+='</ul>';}
 h+='</div>';
 }
 h+=buildDomainPerf();
 return h;
}
function submitExam(){
 let un=0;
 for(let i=0;i<answers.length;i++){if(answers[i]===-1) un++;}
 if(un>0&&!confirm(UI.tienes[L]+" "+un+" "+UI.unanswered[L])) return;
 if(timerID){clearInterval(timerID);timerID=null;}
 examActive=false;clearAutoSave();
 const sc=calcScores();
 const modeStr=getModeStr();
 const avgT=calcTimeStats();
 saveHistoryEntry(sc,modeStr,avgT);
 $("resultsContent").innerHTML=buildResultsHTML(sc,avgT);
 $("reviewArea").innerHTML="";
 showView("results");
}
function buildDomainPerf(){
 const hist=JSON.parse(safeLSGet("itilv5_history","[]"));
 const tc={},tt={};
 for(let d=0;d<7;d++){tc[d]=0;tt[d]=0;}
 for(let i=0;i<hist.length;i++){const e=hist[i];if(e.dc&&e.dt){for(let d=0;d<7;d++){tc[d]+=(e.dc[d]||0);tt[d]+=(e.dt[d]||0);}}}
 let hasData=false;
 for(let d=0;d<7;d++){if(tt[d]>0) hasData=true;}
 if(!hasData) return "";
 let h='<div class="results-box"><h2>'+UI.domPerf[L]+'</h2>';
 for(let d=0;d<7;d++){
 if(tt[d]===0) continue;
 let dp=Math.round((tc[d]/tt[d])*100),col="var(--red)";
 if(dp>=80) col="var(--green)";else if(dp>=65) col="var(--orange)";
 h+='<div class="domain-bar"><div class="name">'+DICONS[d]+' '+DN[d][L].split(" ").slice(0,2).join(" ")+'</div>';
 h+='<div class="bar-bg"><div class="bar-fill" style="width:'+dp+'%;background:'+col+'"></div></div>';
 h+='<div class="pct" style="color:'+col+'">'+dp+'% ('+tc[d]+'/'+tt[d]+')</div></div>';
 }
 h+='</div>';return h;
}
function showReview(){
 let h='<h2 style="margin-top:20px">'+UI.reviewTitle[L]+'</h2>';
 const letters=["A","B","C","D"];
 for(let i=0;i<examQs.length;i++){
 const qObj=examQs[i],ok=answers[i]===qObj.c,order=optOrder[i];
 h+='<div class="review-q '+(ok?"q-correct":"q-wrong")+'"><strong>'+(i+1)+'. '+qObj.q[L]+'</strong>';
 if(qTimes[i]>0) h+=' <span style="color:var(--muted);font-size:.8em">('+qTimes[i]+'s)</span>';
 h+='<br>';
 if(answers[i]===-1){h+='<span style="color:var(--orange)">'+UI.noAnswer[L]+'</span><br>';}
 else{
 let dispAns=-1,dispCorr=-1;
 for(let k=0;k<4;k++){if(order[k]===answers[i])dispAns=k;if(order[k]===qObj.c)dispCorr=k;}
 let yc=ok?"var(--green)":"var(--red)";
 h+=UI.yourAns[L]+': <span style="color:'+yc+'">'+letters[dispAns]+') '+qObj.o[L][answers[i]]+'</span>';
 if(!ok) h+=' — '+UI.correctAns[L]+': <span style="color:var(--green)">'+letters[dispCorr]+') '+qObj.o[L][qObj.c]+'</span>';
 h+='<br>';
 }
 h+='<span style="color:var(--muted)">💡 '+qObj.e[L]+'</span></div>';
 }
 $("reviewArea").innerHTML=h;
}
function renderProgress(){
 const qs=getQStats(); let mastered=0,weak=0,inprog=0,unseen=0;
 let h='<div class="prog-grid">';
 for(let i=0;i<ALL.length;i++){
 const q=ALL[i],s=qs[q.id]; let cls="prog-dot ",tip="";
 if(!s||s.attempts===0){cls+="unseen";unseen++;tip="#"+q.id;}
 else{
 const r=s.correct/s.attempts;
 if(r>=0.8&&s.attempts>=2){cls+="mastered";mastered++;}
 else if(r<0.65){cls+="weak";weak++;}
 else{cls+="inprog";inprog++;}
 tip="#"+q.id+" "+Math.round(r*100)+"% ("+s.correct+"/"+s.attempts+")";
 }
 h+='<div class="'+cls+'" title="'+tip+'">'+(i+1)+'</div>';
 }
 h+='</div><div class="prog-summary">';
 h+='<span><span class="dot" style="background:var(--green)"></span> '+mastered+' '+UI.mastered[L]+'</span>';
 h+='<span><span class="dot" style="background:var(--orange)"></span> '+inprog+' '+UI.inProgress[L]+'</span>';
 h+='<span><span class="dot" style="background:var(--red)"></span> '+weak+' '+UI.weakLabel[L]+'</span>';
 h+='<span><span class="dot" style="background:var(--bg3);border:1px solid var(--border)"></span> '+unseen+' '+UI.unseenLabel[L]+'</span>';
 h+='</div>';
 $("progressContent").innerHTML=h;
}
function resetStats(){if(!confirm(UI.resetConfirm[L]))return;safeLSRemove("itilv5_qstats");renderProgress();renderSummary();toast("✓");}
function renderHistory(){
 const h=JSON.parse(safeLSGet("itilv5_history","[]"));
 if(h.length===0){$("historyContent").innerHTML='<p style="text-align:center;color:var(--muted);margin:30px 0">'+UI.noHist[L]+'</p>';return;}
 let html='<table><thead><tr><th>#</th><th>'+UI.date[L]+'</th><th>'+UI.mode[L]+'</th><th>'+UI.questions[L]+'</th><th>'+UI.correct[L]+'</th><th>'+UI.score[L]+'</th><th>'+UI.status[L]+'</th></tr></thead><tbody>';
 for(let i=h.length-1;i>=0;i--){
 const r=h[i],sc=r.pct>=65?"var(--green)":"var(--red)";
 html+='<tr><td>'+(i+1)+'</td><td>'+r.date+'</td><td>'+r.mode+'</td><td>'+r.total+'</td><td>'+r.correct+'</td>';
 html+='<td style="color:'+sc+';font-weight:700">'+r.pct+'%</td><td>'+(r.pass?"✅":"❌")+'</td></tr>';
 }
 html+='</tbody></table>';
 if(h.length>1){
 html+='<h3 style="margin-top:20px">'+UI.trend[L]+'</h3>';
 html+='<div style="display:flex;align-items:flex-end;gap:4px;height:120px;padding:10px 0">';
 for(let i=0;i<h.length;i++){
 let bH=Math.max(h[i].pct,5),col=h[i].pct>=65?"var(--green)":"var(--red)";
 html+='<div style="flex:1;max-width:40px;height:'+bH+'%;background:'+col+';border-radius:4px 4px 0 0;position:relative" title="'+h[i].pct+'%">';
 html+='<span style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:.7em;color:var(--muted)">'+h[i].pct+'</span></div>';
 }
 html+='</div>';
 }
 html+=buildDomainPerf();
 $("historyContent").innerHTML=html;
}
function clearHistory(){if(confirm(UI.deleteAll[L])){safeLSRemove("itilv5_history");renderHistory();renderSummary();}}
document.addEventListener("keydown",function(e){
 if($("exam").classList.contains("active")){
 if(e.key==="ArrowLeft") prevQ();else if(e.key==="ArrowRight") nextQ();
 else if(e.key==="1"||e.key==="a"||e.key==="A") selectOpt(0);
 else if(e.key==="2"||e.key==="b"||e.key==="B") selectOpt(1);
 else if(e.key==="3"||e.key==="c"||e.key==="C") selectOpt(2);
 else if(e.key==="4"||e.key==="d"||e.key==="D") selectOpt(3);
 else if(e.key==="f"||e.key==="F") toggleFlag();
 }
 if($("flashcards").classList.contains("active")){
 if(e.key==="ArrowLeft") flashPrev();else if(e.key==="ArrowRight") flashNext();
 else if(e.key===" "||e.key==="Enter"){e.preventDefault();flipCard();}
 }
});
window.addEventListener("beforeunload",function(e){if(examActive){autoSave();e.preventDefault();e.returnValue="";}});
document.addEventListener("DOMContentLoaded", function(){
 init();
 $("domainCards").addEventListener("click",function(e){
  const card=e.target.closest("[data-domain]");
  if(card) startDomain(parseInt(card.dataset.domain));
 });
 $("questionArea").addEventListener("click",function(e){
  const opt=e.target.closest("[data-opt]");
  if(opt) selectOpt(parseInt(opt.dataset.opt));
 });
 $("qGrid").addEventListener("click",function(e){
  const dot=e.target.closest("[data-q]");
  if(dot) goToQ(parseInt(dot.dataset.q));
 });
});