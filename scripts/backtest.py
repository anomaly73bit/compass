"""Fixed-rule daily research. Chronological 70/30 split; no holdout selection."""
import json,math,pathlib,datetime,statistics
ROOT=pathlib.Path(__file__).resolve().parents[1]
MODELS={'breakout':'Breakout 20 + trend','pullback':'Pullback RSI 2 + trend','momentum':'Momentum 63 + trend'}
COST=.001

def indicators(rows):
 out=[];e50=e200=rows[0]['close'];atr=rows[0]['high']-rows[0]['low'];gain=loss=0
 for i,r in enumerate(rows):
  c=r['close'];p=rows[i-1]['close'] if i else c
  if i:
   e50+=(c-e50)*2/51;e200+=(c-e200)*2/201
   tr=max(r['high']-r['low'],abs(r['high']-p),abs(r['low']-p));atr=(atr*13+tr)/14
   gain=(gain+max(c-p,0))/2;loss=(loss+max(p-c,0))/2
  rsi=100*gain/(gain+loss) if gain+loss else 50
  out.append({'atr':atr,'e50':e50,'e200':e200,'rsi':rsi})
 return out

def side_at(rows,ind,i,model):
 if i<252 or rows[i]['close']<=0 or ind[i]['atr']<=0:return 0
 c=rows[i]['close'];a=ind[i];up=c>a['e200'] and a['e50']>a['e200'];down=c<a['e200'] and a['e50']<a['e200']
 if model=='breakout':
  p=rows[i-20:i]
  return 1 if up and c>max(r['high'] for r in p) else -1 if down and c<min(r['low'] for r in p) else 0
 if model=='pullback':return 1 if up and a['rsi']<15 else -1 if down and a['rsi']>85 else 0
 return 1 if up and c>rows[i-63]['close'] else -1 if down and c<rows[i-63]['close'] else 0

def plan(rows,ind,i,model):
 side=side_at(rows,ind,i,model)
 if not side:return None
 atr=ind[i]['atr'];r=rows[i];entry=r['high']+.05*atr if side==1 else r['low']-.05*atr
 stop=entry-side*2*atr;target=entry+side*3*atr
 if min(entry,stop,target)<=0:return None
 return {'side':side,'entry':entry,'stop':stop,'target':target,'atr':atr,'maxGap':.5*atr,'signalDate':r['date']}

def simulate(rows,ind,model,start,end,cost=COST):
 equity=10000;peak=equity;dd=0;trades=[];curve=[];pos=None
 for i in range(max(253,start),end):
  r=rows[i]
  if pos is None:
   p=plan(rows,ind,i-1,model)
   if p and r['open']>0:
    s=p['side'];trigger=r['high']>=p['entry'] if s==1 else r['low']<=p['entry']
    entry=max(r['open'],p['entry']) if s==1 else min(r['open'],p['entry'])
    if trigger and entry>0 and abs(entry-p['entry'])<=p['maxGap']:
     qty=min(equity*.005/(2*p['atr']),equity/entry)
     pos={**p,'entry':entry,'stop':entry-s*2*p['atr'],'target':entry+s*3*p['atr'],'qty':qty,'date':r['date'],'idx':i}
  if pos:
   s=pos['side'];exit_price=None;reason=''
   # If both barriers occur in a daily bar, always take the adverse outcome.
   if i>pos['idx'] and (r['open']<=pos['stop'] if s==1 else r['open']>=pos['stop']):exit_price=r['open'];reason='Gap stop'
   elif r['low']<=pos['stop'] if s==1 else r['high']>=pos['stop']:exit_price=pos['stop'];reason='Stop'
   elif r['high']>=pos['target'] if s==1 else r['low']<=pos['target']:exit_price=pos['target'];reason='Target'
   elif i-pos['idx']>=19 or i==end-1:exit_price=r['close'];reason='20 sedute' if i<end-1 else 'Fine periodo'
   if exit_price is not None:
    net=s*(exit_price-pos['entry'])-cost*(abs(pos['entry'])+abs(exit_price));pnl=net*pos['qty'];equity+=pnl
    trades.append({'date':pos['date'],'end':r['date'],'side':s,'entry':pos['entry'],'exit':exit_price,'pnl':pnl,'r':net/(2*pos['atr']),'reason':reason});pos=None
  marked=equity+(pos['side']*(r['close']-pos['entry'])*pos['qty'] if pos else 0)
  peak=max(peak,marked);dd=max(dd,100*(peak-marked)/peak);curve.append({'date':r['date'],'equity':round(marked,2)})
 n=len(trades);wins=sum(t['pnl']>0 for t in trades);gp=sum(max(t['pnl'],0) for t in trades);gl=-sum(min(t['pnl'],0) for t in trades)
 wr=wins/n if n else 0;z=1.96;den=1+z*z/n if n else 1
 center=(wr+z*z/(2*n))/den if n else 0;half=z*math.sqrt(wr*(1-wr)/n+z*z/(4*n*n))/den if n else 0
 metrics={'trades':n,'wins':wins,'winRate':round(100*wr,2) if n else None,'ciLow':round(100*(center-half),1) if n else None,'ciHigh':round(100*(center+half),1) if n else None,'profitFactor':round(gp/gl,3) if gl else None,'expectancyR':round(statistics.mean(t['r'] for t in trades),4) if n else None,'returnPct':round((equity/10000-1)*100,2),'maxDrawdownPct':round(dd,2),'start':rows[max(253,start)]['date'],'end':rows[end-1]['date']}
 return metrics,trades,curve

def analyze(rows,now=None):
 now=now or datetime.datetime.now(datetime.timezone.utc)
 if len(rows)<800:raise ValueError('Meno di 800 sedute valide')
 if rows!=sorted(rows,key=lambda r:r['date']) or len(set(r['date'] for r in rows))!=len(rows):raise ValueError('Date duplicate o non ordinate')
 ind=indicators(rows);split=int(len(rows)*.7);training={m:simulate(rows,ind,m,253,split)[0] for m in MODELS}
 eligible=[m for m in MODELS if training[m]['trades']>=30]
 chosen=max(eligible or list(MODELS),key=lambda m:training[m]['expectancyR'] if training[m]['expectancyR'] is not None else -999)
 test,trades,curve=simulate(rows,ind,chosen,split,len(rows));full,_,_=simulate(rows,ind,chosen,253,len(rows))
 stress,_,_=simulate(rows,ind,chosen,split,len(rows),COST*2)
 passed=chosen in eligible and test['trades']>=20 and test['expectancyR']>0 and (test['profitFactor'] or 0)>=1.1 and test['maxDrawdownPct']<=20 and stress['expectancyR']>0
 p=plan(rows,ind,len(rows)-1,chosen)
 date=datetime.date.fromisoformat(rows[-1]['date']);valid=date+datetime.timedelta(days=1)
 while valid.weekday()>4:valid+=datetime.timedelta(days=1)
 expired=now.date()>valid
 status='stale' if expired else 'setup' if p and passed else 'research' if p else 'wait'
 return {'model':chosen,'modelName':MODELS[chosen],'selectedOn':'Primo 70% dello storico, media R netta; nessuna scelta sul test','training':training[chosen],'test':test,'full':full,'stress':stress,'passed':passed,'status':status,'plan':p,'asOf':rows[-1]['date'],'validDate':valid.isoformat(),'close':rows[-1]['close'],'bars':len(rows),'source':'Yahoo Finance · future continuo','candidates':training,'trades':trades,'curve':curve[::5]+curve[-1:]}

def main():
 assets={}
 for asset in json.loads((ROOT/'assets/markets.json').read_text()):
  symbol=asset[0]
  try:
   data=json.loads((ROOT/'data'/f'{symbol}.json').read_text());result=analyze(data['rows']);assets[symbol]=result
   print(symbol,result['status'],result['model'],result['test']['winRate'],result['test']['trades'],result['test']['profitFactor'],flush=True)
  except Exception as e:assets[symbol]={'status':'unavailable','error':str(e)};print(symbol,str(e),flush=True)
 report={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'timeframe':'D1','assets':assets,'method':{'costBpsPerSide':10,'riskPct':.5,'notionalCap':1,'trainFraction':.7,'minTrainTrades':30,'minTestTrades':20,'targetR':1.5,'stopATR':2,'maxHoldingSessions':20,'limitations':'Futures continui: possibili effetti rollover. Costi stimati, esclusi overnight, imposte e conversioni. Nessuna probabilità garantita per il prossimo trade. Verifica retrospettiva, non track record live. Rischio di selezione multipla su 26 mercati. Le chiusure a fine periodo sono forzate.'}}
 (ROOT/'data/research.json').write_text(json.dumps(report,separators=(',',':'),allow_nan=False))
if __name__=='__main__':main()
