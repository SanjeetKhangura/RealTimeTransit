-- Schema 0.0.3
-- RUN AFTER schema 0.0.2

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_service_alerts_ts_alert_id'
          AND conrelid = 'service_alerts'::regclass
    ) THEN
        ALTER TABLE service_alerts ADD CONSTRAINT uq_service_alerts_ts_alert_id UNIQUE (ts, alert_id);
    END IF;
END$$;

-- Relations are normalized!
CREATE TABLE IF NOT EXISTS service_alert_entities (
    ts TIMESTAMPTZ NOT NULL,
    alert_id VARCHAR(255) NOT NULL,
    agency_id VARCHAR(255),
    route_id VARCHAR(255),
    trip_id VARCHAR(255),
    stop_id VARCHAR(255),
    direction_id INTEGER,
    FOREIGN KEY (ts, alert_id) REFERENCES service_alerts(ts, alert_id) ON DELETE CASCADE
);

-- Indexes for entity lookups by alert
CREATE INDEX IF NOT EXISTS idx_alert_entities_route ON service_alert_entities (route_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_alert_entities_trip ON service_alert_entities (trip_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_alert_entities_stop ON service_alert_entities (stop_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_alert_entities_agency ON service_alert_entities (agency_id, ts DESC);

