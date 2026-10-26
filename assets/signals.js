export function evaluate(asset,now=Date.now()){
 const blocked={active:false,reason:'Dati non disponibili',direction:null};
 if(!asset||!Array.isArray(asset.bars)||asset.bars.length<60)return blocked;
 const bars=asset.bars.filter(b=>Number.isFinite(b.time)&&b.time+300<=now/1000&&['open','high','low','close'].every(k=>Number.isFinite(b[k]))).sort((a,b)=>a.time-b.time);
 if(bars.length<60)return blocked;
 let ema=bars[0].close,atr=bars[0].high-bars[0].low;const n=bars.length;
 for(let i=1;i<n;i++){ema=bars[i].close*2/51+ema*49/51;const tr=Math.max(bars[i].high-bars[i].low,Math.abs(bars[i].high-bars[i-1].close),Math.abs(bars[i].low-bars[i-1].close));atr=(atr*13+tr)/14;}
 const last=bars.at(-1),prev=bars.slice(-21,-1);const side=last.close>Math.max(...prev.map(b=>b.high))&&last.close>ema?1:last.close<Math.min(...prev.map(b=>b.low))&&last.close<ema?-1:0;
 const age=now/1000-asset.quoteTime,barAge=now/1000-(last.time+300);
 let reason='Nessun ingresso';
 if(asset.realtime!==true)reason='Prezzo ritardato · ingresso sospeso';
 else if(!Number.isFinite(asset.quoteTime)||age>90||age< -10)reason='Quotazione non aggiornata';
 else if(asset.marketOpen!==true)reason='Mercato non disponibile';
 else if(barAge>90||barAge<0)reason='Segnale scaduto';
 else if(!side||!Number.isFinite(atr)||atr<=0)reason='Nessun ingresso';
 else if(!Number.isFinite(asset.price)||asset.price<=0||Math.abs(asset.price-last.close)>atr*.25)reason='Prezzo fuori dalla zona di ingresso';
 else return {active:true,direction:side===1?'COMPRA':'VENDI',entry:asset.price,stop:asset.price-side*2*atr,target:asset.price+side*4*atr,from:(last.time+300)*1000,until:Math.min((last.time+390)*1000,(asset.quoteTime+90)*1000),reason:'Ordine a mercato'};
 return {...blocked,reason};
}
