
function analyze(rows, mode='breakout', cost=10) {
 const n=rows.length; if(n<260)throw Error('Servono almeno 260 sedute complete.');
 const c=rows.map(x=>x.close), ema=(period)=>{let a=[c[0]],k=2/(period+1);for(let i=1;i<n;i++)a.push(c[i]*k+a[i-1]*(1-k));return a;};
 const e50=ema(50),e200=ema(200),atr=[];
 for(let i=0;i<n;i++){const r=rows[i],tr=i?Math.max(r.high-r.low,Math.abs(r.high-c[i-1]),Math.abs(r.low-c[i-1])):r.high-r.low;atr.push(i?(atr[i-1]*13+tr)/14:tr);}
 function signal(i){if(i<252)return 0; if(mode==='momentum')return c[i]>c[i-252]&&c[i]>e200[i]?1:c[i]<c[i-252]&&c[i]<e200[i]?-1:0;
 if(mode==='trend')return e50[i]>e200[i]&&c[i]>e50[i]?1:e50[i]<e200[i]&&c[i]<e50[i]?-1:0;
 const prev=rows.slice(i-55,i);return c[i]>Math.max(...prev.map(r=>r.high))&&c[i]>e200[i]?1:c[i]<Math.min(...prev.map(r=>r.low))&&c[i]<e200[i]?-1:0;}
 const trades=[],curve=[];let equity=10000,peak=10000,dd=0,pos=null;
 for(let i=253;i<n;i++){
  const r=rows[i];
  if(!pos){let s=signal(i-1);if(s&&atr[i-1]>0){const risk=2*atr[i-1];pos={side:s,entry:r.open,stop:r.open-s*risk,target:r.open+s*2*risk,qty:Math.min(equity*.005/risk,equity/Math.abs(r.open)),date:r.date,idx:i};}}
  if(pos){let x=null,reason='';const s=pos.side;
   if(s===1?r.open<=pos.stop:r.open>=pos.stop){x=r.open;reason='Gap stop';}
   else if(s===1?r.low<=pos.stop:r.high>=pos.stop){x=pos.stop;reason='Stop';}
   else if(s===1?r.high>=pos.target:r.low<=pos.target){x=(s===1?Math.max(r.open,pos.target):Math.min(r.open,pos.target));reason='Target';}
   else if(i-pos.idx>=40||i===n-1){x=r.close;reason=i===n-1?'Fine campione':'40 sedute';}
   if(x!==null){const pnl=(s*(x-pos.entry)-(Math.abs(pos.entry)+Math.abs(x))*cost/10000)*pos.qty;equity+=pnl;trades.push({...pos,exit:x,end:r.date,pnl,reason});pos=null;}
  }
  const marked=equity+(pos?pos.side*(r.close-pos.entry)*pos.qty:0);peak=Math.max(peak,marked);dd=Math.max(dd,(peak-marked)/peak*100);curve.push({date:r.date,value:marked});
 }
 const i=n-1,s=signal(i),prev=rows.slice(n-55),hi=Math.max(...prev.map(r=>r.high)),lo=Math.min(...prev.map(r=>r.low));
 return {side:s,close:c[i],atr:atr[i],ema50:e50[i],ema200:e200[i],hi,lo,trades,curve,dd,equity,date:rows[i].date,change:100*(c[i]/c[i-1]-1)};
}

import assert from 'node:assert/strict';
const rows=Array.from({length:700},(_,i)=>({date:new Date(Date.UTC(2020,0,i+1)).toISOString().slice(0,10),open:100+i*.2,high:101+i*.2,low:99+i*.2,close:100.5+i*.2}));
const a=analyze(rows,'trend',0),b=analyze(rows,'trend',20);assert.equal(a.side,1);assert(a.trades.length>0);assert(b.equity<a.equity);assert(a.trades.every(t=>t.idx>=253&&t.qty>0));assert.throws(()=>analyze(rows.slice(0,100)));const flat=rows.map(x=>({...x,open:100,high:100,low:100,close:100}));assert.equal(analyze(flat).trades.length,0);console.log('PASS: trend, costs, warmup, flat series, insufficient data');
