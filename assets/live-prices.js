// Public, keyless spot quotes. Never combine them with futures candles.
export function normalizeSpot(raw,symbol,now=Date.now()){
 const quoteTime=Date.parse(raw?.updatedAt)/1000,age=now/1000-quoteTime;
 if(raw?.symbol!==symbol||raw.currency!=='USD'||!Number.isFinite(raw.price)||raw.price<=0||!Number.isFinite(quoteTime)||age< -10)throw Error('Quotazione spot non valida');
 return {price:raw.price,quoteTime,realtime:age<=90,marketOpen:false,bars:[],source:'Gold API · spot USD',quoteOnly:true,quoteFresh:age<=90};
}
export async function loadSpotQuotes(fetcher=fetch,now=Date.now()){
 const pairs=[['GC','XAU'],['SI','XAG']];
 const results=await Promise.allSettled(pairs.map(async([id,symbol])=>{
 const r=await fetcher('https://api.gold-api.com/price/'+symbol,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Feed HTTP '+r.status);
 return [id,normalizeSpot(await r.json(),symbol,now)];}));
 return Object.fromEntries(results.map((r,i)=>r.status==='fulfilled'?r.value:[pairs[i][0],{realtime:false,bars:[],quoteOnly:true,quoteError:true,source:'Gold API · spot USD'}]));
}
