import {evaluate} from './signals.js';
import {loadSpotQuotes} from './live-prices.js';
const assets=await fetch('./assets/markets.json').then(r=>{if(!r.ok)throw Error('Catalogo non disponibile');return r.json();});
const $=id=>document.getElementById(id),num=v=>Number.isFinite(v)?v.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:3}):'—',time=v=>Number.isFinite(v)?new Date(v).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
let feed={},filter='all',busy=false,endpoint=localStorage.getItem('compass-feed')||'',failed=false;$('endpoint').value=endpoint;
function render(){const now=Date.now();$('clock').textContent=time(now);let active=0,shown=0,unavailable=0,analyzed=0;
const query=($('search').value||'').toLocaleLowerCase('it-IT');
const html=assets.map(([id,name,group,icon,unit])=>{const a=feed.assets?.[id],s=evaluate(failed?null:a,now);if(s.active)active++;if(s.status==='unavailable')unavailable++;else analyzed++;
if(filter==='active'&&!s.active||!['all','active',group].includes(filter)||!name.toLocaleLowerCase('it-IT').includes(query))return '';shown++;
const params=s.active?[['Direzione',s.direction],['Ingresso',num(s.entry)],['Stop loss',num(s.stop)],['Take profit',num(s.target)]]:[['Direzione','—'],['Ingresso','—'],['Stop loss','—'],['Take profit','—']];
const fresh=a?.realtime&&Number.isFinite(a.quoteTime)&&now/1000-a.quoteTime<=90;
const label=s.active?'ENTRA · '+s.direction:s.status==='unavailable'?'DATI INSUFFICIENTI':'NON ENTRARE';
return '<article class="card '+group+' '+s.status+'"><div class="card-top"><div class="icon">'+icon+'</div><div><h2>'+name+'</h2><div class="category">'+(a?.quoteOnly?'Spot · Gold API':{metals:'Metalli',energy:'Energia',agri:'Agricoli',livestock:'Allevamento'}[group])+'</div></div></div><div class="badge">'+label+'</div><div class="price">'+num(a?.price)+'<small>'+unit+'</small></div><div class="why">'+s.reason+(s.active?' · fino alle '+time(s.until):'')+'</div><div class="parameters">'+params.map(([k,v])=>'<div><span>'+k+'</span><b>'+v+'</b></div>').join('')+'</div><div class="card-bottom"><span>Prezzo <b>'+ (a?.quoteTime?new Date(a.quoteTime*1000).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—')+'</b></span><span class="'+(fresh?'live-tag':'')+'">'+(s.active?'Dalle '+time(s.from):fresh?'● LIVE':'Ritardato / assente')+'</span></div></article>';}).join('');
$('cards').innerHTML=shown?html:'<div class="empty">'+(filter==='active'&&analyzed===0?'Nessun mercato ha ancora i dati completi per generare ingressi.':'Nessuna commodity corrisponde al filtro.')+'</div>';
$('count').textContent=active+' ingressi · '+analyzed+' analizzabili';$('total').textContent=assets.length;
const live=Object.values(feed.assets||{}).filter(a=>a.realtime===true&&now/1000-a.quoteTime<=90).length;
$('feedStatus').textContent=live+' prezzi live · '+assets.length+' commodities';
$('feedDetail').textContent=analyzed===0?'Segnali bloccati dai dati, non dal mercato':unavailable+' mercati con dati incompleti';
$('dataNotice').hidden=unavailable===0;$('dataNotice').textContent=analyzed===0?'I prezzi sono visibili, ma i segnali non sono ancora operativi: mancano storico compatibile e verifiche live. Attendere sul sito non sblocca gli ingressi.':unavailable+' mercati in arancione non sono analizzabili: dati mancanti o ritardati.';
}
let lastAttempt=0;
async function refresh(){if(busy||Date.now()-lastAttempt<30000)return;lastAttempt=Date.now();busy=true;$('refresh').disabled=true;try{
 if(endpoint){const r=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Feed non disponibile');const d=await r.json();if(!d.assets||typeof d.assets!=='object')throw Error('Formato non valido');feed=d;}
 else {const [snapshot,spot]=await Promise.allSettled([fetch('./data/intraday.json?t='+Math.floor(Date.now()/30000),{signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error();return r.json();}),loadSpotQuotes()]);
 const base=snapshot.status==='fulfilled'?snapshot.value:{assets:feed.assets||{}};
 const quotes=spot.status==='fulfilled'?spot.value:{GC:{quoteOnly:true,quoteError:true,bars:[]},SI:{quoteOnly:true,quoteError:true,bars:[]},PL:{quoteOnly:true,quoteError:true,bars:[]},PA:{quoteOnly:true,quoteError:true,bars:[]}};
 feed={...base,assets:{...base.assets,...quotes}};}
 failed=false;$('message').textContent='';
 }catch(e){failed=true;$('message').textContent='Impossibile aggiornare le quotazioni. Nessun ingresso attivo.';}finally{busy=false;$('refresh').disabled=false;render();}}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render();});$('refresh').onclick=refresh;$('search').oninput=render;
$('saveFeed').onclick=()=>{try{const u=new URL($('endpoint').value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error();endpoint=u.href;localStorage.setItem('compass-feed',endpoint);lastAttempt=0;$('connectionState').textContent='Collegamento salvato in questo browser.';refresh();}catch{$('connectionState').textContent='Inserisci un URL HTTPS senza credenziali o chiavi nella query.';}};$('resetFeed').onclick=()=>{endpoint='';lastAttempt=0;localStorage.removeItem('compass-feed');$('endpoint').value='';refresh();};render();refresh();setInterval(render,1000);setInterval(()=>{if(!document.hidden)refresh();},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
