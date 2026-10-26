import concurrent.futures,datetime,json,pathlib,urllib.request,urllib.parse,math
ROOT=pathlib.Path(__file__).resolve().parents[1]
SYMBOLS=['GC','SI','CL','BZ','NG','HG','ZC','ZW']
def get(symbol):
 try:
  req=urllib.request.Request('https://query1.finance.yahoo.com/v8/finance/chart/'+urllib.parse.quote(symbol+'=F')+'?range=5d&interval=5m',headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=25) as r: raw=json.load(r)
  r=raw['chart']['result'][0];q=r['indicators']['quote'][0];m=r['meta'];bars=[]
  for i,t in enumerate(r['timestamp']):
   b={'time':t,**{k:q[k][i] for k in ['open','high','low','close']}}
   if all(isinstance(b[k],(int,float)) and math.isfinite(b[k]) for k in ['open','high','low','close']):bars.append(b)
  print(symbol,len(bars),'intraday bars')
  return symbol,{'price':m.get('regularMarketPrice'),'quoteTime':m.get('regularMarketTime'),'realtime':False,'marketOpen':False,'bars':bars[-180:],'source':'Yahoo Finance · ritardo possibile, non verificato live'}
 except Exception as e:
  print(symbol,'non disponibile:',e);return symbol,None
if __name__=='__main__':
 path=ROOT/'data/intraday.json';old=json.loads(path.read_text()) if path.exists() else {'assets':{}}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for symbol,d in pool.map(get,SYMBOLS):
   if d:old['assets'][symbol]=d
 old['fetchedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();path.write_text(json.dumps(old,separators=(',',':')))
