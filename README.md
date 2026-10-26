# Compass — strategie giornaliere

Jekyll / GitHub Pages. 26 commodities. Motore scripts/backtest.py, report data/research.json, frontend assets/app.js.

Tre regole prefissate: breakout20, pullbackRSI2, momentum63 con filtro EMA50/200. Selezione su primo70% per expectancyR netta (almeno30 trade se disponibile); verifica cronologica restante30%, non usata per scegliere il modello. Costi10bp/lato, rischio0.5%, notional1x. Pending stop su high/low precedente±0.05ATR; trigger valido una seduta, gap>0.5ATR annulla. Stop2ATR/target3ATR, stop prioritario se entrambi nella candela, massimo20 sedute. Intervallo winrate Wilson95%; non è probabilità del prossimo trade. Drawdown close-to-close mark-to-market. Finanziamento CFD, roll, imposte e cambio esclusi. Il future continuo può avere discontinuità. Validazione retrospettiva con selezione multipla, nessun track record live.

Setup verde D1 solo se minimo30 trade training/20 test, PF≥1.1, expectancy positiva, DD≤20%, stress costi doppi positivo e segnale corrente. Non conferma che il trigger non sia già stato toccato. Piano valido nella prossima data feriale dopo l'ultima chiusura (weekend esclusi, festività non modellate; scadenza conservativa). Nessun ordine eseguito, livelli futures da confrontare al contratto effettivo. Spot Gold API separato dai test.

Workflow aggiorna storici26, intraday e report prima di Jekyll. `python scripts/test_backtest.py` verifica causalità, stop-first, ordini non eseguiti, cancellazione gap e costi.
