# Commodity Compass

Dashboard italiana per analisi giornaliera di 8 commodities, grafici, strategie e backtest. Nessun ordine automatico o collegamento a XTB.

## GitHub Pages
Workflow `.github/workflows/pages.yml`: test, aggiornamento storico, pubblicazione Pages. Settings → Pages → Source: GitHub Actions.

## Dati
`scripts/update_data.py` richiede serie Yahoo Finance. Gli snapshot iniziali sono in `data/`; il workflow conserva e committa gli aggiornamenti prima della pubblicazione. In caso di errore mantiene i dati precedenti. I segnali oltre 96 ore vengono bloccati. Aggiornamento programmato 06:15 e 22:15 UTC, soggetto ai ritardi di GitHub Actions.

## Limiti
Dati futures continui, non prezzi XTB; controllare rollover e unità. Backtest a regole fisse con costi stimati, ma senza finanziamento overnight o costi rollover. Non certifica rendimenti futuri. Nessun segreto o dato del conto nel repository.

## Sviluppo
`node engine-test.mjs` e `python scripts/update_data.py`. Servire la cartella con un server HTTP statico.
