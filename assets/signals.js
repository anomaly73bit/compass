export function evaluate(asset,now=Date.now()){
 const unavailable=reason=>({active:false,status:'unavailable',reason,direction:null});
 const wait=reason=>({active:false,status:'wait',reason,direction:null});
 if(!asset)return unavailable('Quotazione non disponibile');
 if(asset.quoteOnly)return unavailable(asset.quoteError?'Feed spot non disponibile':now/1000-asset.quoteTime>90?'Prezzo spot non aggiornato':'Prezzo live · manca lo storico spot');
 if(asset.realtime!==true)return unavailable('Feed ritardato · analisi live sospesa');
 const age=now/1000-asset.quoteTime;
 if(!Number.isFinite(asset.quoteTime)||age>90||age< -10)return unavailable('Quotazione non aggiornata');
 if(asset.marketOpen!==true)return unavailable('Sessione di mercato non verificata');
 if(!Array.isArray(asset.bars)||asset.bars.length<60)return unavailable('Storico insufficiente');
 const bars=asset.bars.filter(b=>Number.isFinite(b.time)&&b.time+300<=now/1000&&['open','high','low','close'].every(k=>Number.isFinite(b[k]))).sort((a,b)=>a.time-b.time);
 if(bars.length<60)return unavailable('Mancano 60 candele complete');
 let ema=bars[0].close,atr=bars[0].high-bars[0].low;const n=bars.length;
 for(let i=1;i<n;i++){ema=bars[i].close*2/51+ema*49/51;const tr=Math.max(bars[i].high-bars[i].low,Math.abs(bars[i].high-bars[i-1].close),Math.abs(bars[i].low-bars[i-1].close));atr=(atr*13+tr)/14;}
 const last=bars.at(-1),prev=bars.slice(-21,-1);const side=last.close>Math.max(...prev.map(b=>b.high))&&last.close>ema?1:last.close<Math.min(...prev.map(b=>b.low))&&last.close<ema?-1:0;
 const barAge=now/1000-(last.time+300);
 if(barAge>90||barAge<0)return unavailable('Ultima candela non aggiornata');
 if(!side||!Number.isFinite(atr)||atr<=0)return wait('Analizzato · nessun setup valido');
 if(!Number.isFinite(asset.price)||asset.price<=0||Math.abs(asset.price-last.close)>atr*.25)return wait('Prezzo fuori dalla zona di ingresso');
 return {active:true,status:'active',direction:side===1?'COMPRA':'VENDI',entry:asset.price,stop:asset.price-side*2*atr,target:asset.price+side*4*atr,from:(last.time+300)*1000,until:Math.min((last.time+390)*1000,(asset.quoteTime+90)*1000),reason:'Ordine a mercato'};
}
