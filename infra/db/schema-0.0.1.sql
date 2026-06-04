CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Static Schedule Tables
CREATE TABLE gtfs_datasets (
    dataset_id SERIAL PRIMARY KEY,
    import_date TIMESTAMPTZ DEFAULT NOW(),
    start_date DATE,
    end_date DATE,
    description TEXT
);

CREATE TABLE routes (
    dataset_id INTEGER REFERENCES gtfs_datasets(dataset_id),
    route_id VARCHAR(255),
    route_short_name VARCHAR(50),
    route_long_name VARCHAR(255),
    route_type INTEGER,
    PRIMARY KEY (dataset_id, route_id)
);

CREATE TABLE trips (
    dataset_id INTEGER REFERENCES gtfs_datasets(dataset_id),
    trip_id VARCHAR(255),
    route_id VARCHAR(255),
    service_id VARCHAR(255),
    direction_id INTEGER,
    PRIMARY KEY (dataset_id, trip_id)
);

CREATE TABLE stops (
    dataset_id INTEGER REFERENCES gtfs_datasets(dataset_id),
    stop_id VARCHAR(255),
    stop_name VARCHAR(255),
    stop_lat DOUBLE PRECISION,
    stop_lon DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326), -- PostGIS 
    PRIMARY KEY (dataset_id, stop_id)
);

-- Realtime Tables (Timescale Hypertables)
-- Soft FK references to static tables
CREATE TABLE vehicle_positions (
    ts TIMESTAMPTZ NOT NULL,
    vehicle_id VARCHAR(255) NOT NULL,
    trip_id VARCHAR(255),
    route_id VARCHAR(255),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326), -- PostGIS (Magic number: WGS 84)
    bearing DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    current_status VARCHAR(50),
    current_stop_sequence INTEGER,
    stop_id VARCHAR(255),
    congestion_level VARCHAR(50)
);

CREATE TABLE trip_updates (
    ts TIMESTAMPTZ NOT NULL,
    trip_id VARCHAR(255) NOT NULL,
    route_id VARCHAR(255),
    stop_id VARCHAR(255) NOT NULL,
    stop_sequence INTEGER,
    arrival_delay INTEGER, -- seconds
    arrival_time TIMESTAMPTZ,
    departure_delay INTEGER, -- seconds
    departure_time TIMESTAMPTZ,
    schedule_relationship VARCHAR(50)
);

CREATE TABLE service_alerts (
    ts TIMESTAMPTZ NOT NULL,
    alert_id VARCHAR(255) NOT NULL,
    cause VARCHAR(50),
    effect VARCHAR(50),
    header_text TEXT,
    description_text TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
);

-- Hypertables
SELECT create_hypertable('vehicle_positions', 'ts');
SELECT create_hypertable('trip_updates', 'ts');
SELECT create_hypertable('service_alerts', 'ts');

-- Indexes to start with (to be further optimized later)
CREATE INDEX idx_veh_pos_trip ON vehicle_positions (trip_id, ts DESC);
CREATE INDEX idx_veh_pos_route ON vehicle_positions (route_id, ts DESC);
CREATE INDEX idx_veh_pos_geom ON vehicle_positions USING GIST (geom);

CREATE INDEX idx_trip_upd_trip ON trip_updates (trip_id, ts DESC);
CREATE INDEX idx_trip_upd_stop ON trip_updates (stop_id, ts DESC);

CREATE INDEX idx_alerts_id ON service_alerts (alert_id, ts DESC);