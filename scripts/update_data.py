import concurrent.futures,datetime,json,math,pathlib,urllib.request,urllib.parse,time
ROOT=pathlib.Path(__file__).resolve().parents[1]
SYMBOLS=[a[0]+'=F' for a in json.loads((ROOT/'assets/markets.json').read_text())]
def download(symbol):
    path=ROOT/'data'/(symbol.replace('=F','')+'.json')
    try:
        url='https://query1.finance.yahoo.com/v8/finance/chart/'+urllib.parse.quote(symbol)+'?range=10y&interval=1d'
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=20) as res: raw=json.load(res)
        result=raw['chart']['result'][0];q=result['indicators']['quote'][0];rows=[]
        today=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
        for i,t in enumerate(result['timestamp']):
            date=datetime.datetime.fromtimestamp(t,datetime.timezone.utc).date().isoformat()
            row={'date':date,**{k:q[k][i] for k in ['open','high','low','close']}}
            if date>=today or not all(isinstance(row[k],(int,float)) and math.isfinite(row[k]) for k in ['open','high','low','close']):continue
            if row['high']<max(row['open'],row['close'],row['low']) or row['low']>min(row['open'],row['close']):continue
            rows.append(row)
        if len(rows)<260:raise ValueError('Storico insufficiente')
        data={'rows':rows,'source':'Yahoo Finance · futures continui · '+symbol,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
        path.write_text(json.dumps(data,separators=(',',':')))
        return symbol+': '+str(len(rows))+' sedute, ultima '+rows[-1]['date']
    except Exception as e:
        if path.exists():return symbol+': aggiornamento non disponibile; conservato storico precedente: '+str(e)
        path.write_text(json.dumps({'error':'Storico non disponibile. Importa CSV o attendi il prossimo aggiornamento.'}))
        return symbol+': nessuno storico: '+str(e)
if __name__=='__main__':
    (ROOT/'data').mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for message in pool.map(download,SYMBOLS):print(message)
