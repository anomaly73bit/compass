# Compass — Jekyll

Tema Jekyll basato su Minima, layout personalizzato per schede semaforo. Pagina principale essenziale, analisi giornaliera precedente in laboratorio.html.

## Dati e stati
Il feed gratuito Yahoo intraday viene aggiornato da GitHub Actions ogni 15 minuti (possibili ritardi Actions). Non è certificato live: realtime=false, quindi NON attiva ingressi verdi. La pagina mostra sempre il timestamp del prezzo.

Il menu Collegamento dati può ricevere un endpoint HTTPS autorizzato che restituisca feed-format.json con CORS. Nessuna API key nel browser o nel repo. Il feed deve fornire dati dello stesso strumento e certificare realtime e marketOpen. Chiave/provider realtime non ancora forniti.

Verde solo con quote <=90 secondi, sessione aperta, ultimo breakout 20 barre da <=90 secondi, EMA50, dati 5 minuti completi, ATR14 e distanza <=0,25 ATR. Stop 2 ATR e target 4 ATR dal prezzo. Parametri indicativi: i prezzi del provider non equivalgono necessariamente ai contratti del broker. Nessun orario futuro inventato. Le regole intraday non sono validate dal backtest giornaliero.

## Test e build
node signal-test.mjs
node engine-test.mjs
bundle install
bundle exec jekyll build

Workflow pages.yml aggiorna dati, salva snapshot e pubblica. GitHub Actions pianificato non garantisce puntualità o tempo reale. Performance non garantite; test paper prima dell'uso reale.

## Quotazioni spot gratuite
Gold API XAU e XAG integrato direttamente nel browser, aggiornamento ogni 30 secondi. Nessuna chiave per i prezzi. Timestamp del provider = ultima acquisizione, non timestamp exchange. I prezzi spot NON vengono mischiati alle candele futures. Il feed non fornisce sessione aperta verificata: marketOpen=false. Mancano storico spot OHLC e validazione intraday per attivare ingressi. OHLC gratuito 10 chiamate/ora, richiede account/chiave conservata lato server. Fonte: https://gold-api.com/faqs
