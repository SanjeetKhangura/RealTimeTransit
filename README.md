# Real-Time Transit System

INFO 4190 (S10) group project. Turns TransLink GTFS-Realtime feeds into a long-term analytical resource: historical reliability profiles, ML-driven arrival forecasts, and a web dashboard for commuters and admins.

Full project specification: [docs/Project Confirmation.pdf](docs/Project%Confirmation.pdf)

## Group 1

- Chloe Chang (100441028)
- Sanjeet Khangura (100379050)
- Kumardeep Singh (100369778)
- James Sinclair (100443197)

## System Pillars

1. **Ingestion** (`backend/`) — Poll TransLink GTFS-Realtime every 30s, persist snapshots, download GTFS-Static schedule, handle failures without crashing, filter invalid data.
2. **Processing** (`backend/`) — Schedule adherence, bus bunching detection, service-gap detection, hour-of-day reliability profiles per route and segment.
3. **ML Prediction** (`ml/`) — Train a model (LSTM or XGBoost regressor) on historical time-series data, generate forecasted arrival times, log predicted-vs-actual for accuracy tracking.
4. **Dashboard + Admin UI** (`frontend/`) — Route List and Route Details views, responsive down to 360px, plus an admin panel for logs, manual reprocessing, and threshold tuning.

## Directory Layout

```
RealTimeTransit/
  backend/    # Ingestion worker, processing pipeline, API
  frontend/   # Web dashboard (route list, route details, admin)
  ml/         # Training pipelines, model artefacts, prediction service
  docs/       # Final report and any future design docs
```

