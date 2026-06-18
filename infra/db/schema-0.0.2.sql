-- Schema 0.0.2
-- RUN AFTER schema 0.0.1

-- Drop static tables if they exist
DROP TABLE IF EXISTS feed_info CASCADE;
DROP TABLE IF EXISTS calendar_dates CASCADE;
DROP TABLE IF EXISTS calendar CASCADE;
DROP TABLE IF EXISTS stop_times CASCADE;
DROP TABLE IF EXISTS shapes CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'gtfs_datasets'
          AND column_name = 'dataset_id'
          AND is_identity = 'YES'
    ) THEN
        ALTER TABLE gtfs_datasets ALTER COLUMN dataset_id DROP DEFAULT;
        ALTER TABLE gtfs_datasets ALTER COLUMN dataset_id ADD GENERATED ALWAYS AS IDENTITY;
    END IF;
END$$;

ALTER TABLE gtfs_datasets ADD COLUMN IF NOT EXISTS feed_version TEXT UNIQUE;

-- Feed Information metadata (per dataset)
CREATE TABLE feed_info (
    dataset_id INTEGER PRIMARY KEY REFERENCES gtfs_datasets(dataset_id) ON DELETE CASCADE,
    feed_publisher_name TEXT NOT NULL,
    feed_publisher_url TEXT NOT NULL,
    feed_lang VARCHAR(10) NOT NULL,
    default_lang VARCHAR(10),
    feed_start_date DATE,
    feed_end_date DATE,
    feed_version TEXT
);

-- weekly service patterns
CREATE TABLE calendar (
    dataset_id INTEGER NOT NULL REFERENCES gtfs_datasets(dataset_id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    monday SMALLINT NOT NULL CHECK (monday IN (0, 1)),
    tuesday SMALLINT NOT NULL CHECK (tuesday IN (0, 1)),
    wednesday SMALLINT NOT NULL CHECK (wednesday IN (0, 1)),
    thursday SMALLINT NOT NULL CHECK (thursday IN (0, 1)),
    friday SMALLINT NOT NULL CHECK (friday IN (0, 1)),
    saturday SMALLINT NOT NULL CHECK (saturday IN (0, 1)),
    sunday SMALLINT NOT NULL CHECK (sunday IN (0, 1)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    PRIMARY KEY (dataset_id, service_id)
);

CREATE INDEX idx_calendar_service ON calendar(dataset_id, service_id);
CREATE INDEX idx_calendar_date_range ON calendar(dataset_id, start_date, end_date);

-- Calendar Exceptions (specific date overrides)
CREATE TABLE calendar_dates (
    dataset_id INTEGER NOT NULL REFERENCES gtfs_datasets(dataset_id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    date DATE NOT NULL,
    exception_type SMALLINT NOT NULL CHECK (exception_type IN (1, 2)),
    PRIMARY KEY (dataset_id, service_id, date),
    FOREIGN KEY (dataset_id, service_id) REFERENCES calendar(dataset_id, service_id) ON DELETE CASCADE
);

CREATE INDEX idx_calendar_dates_lookup ON calendar_dates(dataset_id, service_id, date);

-- arrival/departure times per stop per trip
-- Times stored as seconds after midnight (can exceed 86400 for next-day arrivals)
CREATE TABLE stop_times (
    dataset_id INTEGER NOT NULL REFERENCES gtfs_datasets(dataset_id) ON DELETE CASCADE,
    trip_id TEXT NOT NULL,
    stop_sequence INTEGER NOT NULL,
    stop_id TEXT NOT NULL,
    arrival_seconds INTEGER,  -- seconds after midnight (>86400 for trips across midnight)
    departure_seconds INTEGER, -- seconds after midnight (>86400 for trips across midnight)
    pickup_type SMALLINT DEFAULT 0 CHECK (pickup_type IN (0, 1, 2, 3)),
    drop_off_type SMALLINT DEFAULT 0 CHECK (drop_off_type IN (0, 1, 2, 3)),
    shape_dist_traveled NUMERIC,
    PRIMARY KEY (dataset_id, trip_id, stop_sequence),
    FOREIGN KEY (dataset_id, trip_id) REFERENCES trips(dataset_id, trip_id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_id, stop_id) REFERENCES stops(dataset_id, stop_id) ON DELETE CASCADE
);

CREATE INDEX idx_stop_times_trip ON stop_times(dataset_id, trip_id, stop_sequence);
CREATE INDEX idx_stop_times_stop ON stop_times(dataset_id, stop_id);
CREATE INDEX idx_stop_times_arrival ON stop_times(dataset_id, stop_id, arrival_seconds);

-- Shapes (route geometry paths - stored as PostGIS geometry points)
CREATE TABLE shapes (
    dataset_id INTEGER NOT NULL REFERENCES gtfs_datasets(dataset_id) ON DELETE CASCADE,
    shape_id TEXT NOT NULL,
    shape_pt_sequence INTEGER NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    shape_dist_traveled NUMERIC,
    PRIMARY KEY (dataset_id, shape_id, shape_pt_sequence)
);

CREATE INDEX idx_shapes_id ON shapes(dataset_id, shape_id, shape_pt_sequence);
CREATE INDEX idx_shapes_geom ON shapes USING GIST(geom);

-- cache view of geom points as line so applications do not need to construct lines from points
DROP MATERIALIZED VIEW IF EXISTS shape_paths;
CREATE MATERIALIZED VIEW shape_paths AS
    SELECT
        dataset_id,
        shape_id,
        ST_MakeLine(geom ORDER BY shape_pt_sequence) AS geom
    FROM shapes
    GROUP BY dataset_id, shape_id;

CREATE UNIQUE INDEX idx_shape_paths ON shape_paths(dataset_id, shape_id);
REFRESH MATERIALIZED VIEW shape_paths;

-- existing trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS shape_id TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_headsign TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS wheelchair_accessible SMALLINT CHECK (wheelchair_accessible IS NULL OR wheelchair_accessible IN (0, 1, 2));
ALTER TABLE trips ADD COLUMN IF NOT EXISTS bikes_allowed SMALLINT CHECK (bikes_allowed IS NULL OR bikes_allowed IN (0, 1, 2));
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_trips_shape'
          AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT fk_trips_shape
            FOREIGN KEY (dataset_id, shape_id) REFERENCES shapes(dataset_id, shape_id) ON DELETE SET NULL;
    END IF;
END$$;

-- existing stops table
ALTER TABLE stops ADD COLUMN IF NOT EXISTS stop_code TEXT;
ALTER TABLE stops ADD COLUMN IF NOT EXISTS stop_desc TEXT;
ALTER TABLE stops ADD COLUMN IF NOT EXISTS wheelchair_boarding SMALLINT CHECK (wheelchair_boarding IS NULL OR wheelchair_boarding IN (0, 1, 2));

-- existing routes table
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_desc TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_url TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_color VARCHAR(6);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_text_color VARCHAR(6);
