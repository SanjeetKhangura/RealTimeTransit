# Real-Time Transit System
INFO 4290 (S50) 

Display scheduled, real-time, and predicted route times along with detailed alerts to commuters

Project Confirmation Document: [docs/Project Confirmation.pdf](docs/Project%Confirmation.pdf)

## Group 1

- Chloe Chang (100441028)
- Sanjeet Khangura (100379050)
- Kumardeep Singh (100369778)
- James Sinclair (100443197)

## Modules

| Module | Location | Purpose |
|-|-|-|
| Ingest Worker | `ingest` | Poll GTFS-Realtime feed, storing current state to the database |
| API Server | `api` | Interface between the database, predictions, ingest worker, and dashboard |
| Dashboard UI | `frontend` | Display route data, insights, and predictions to users |
| Machine Learning | `ml` | Predict future arrival times based on historical data (stretch goal) |
