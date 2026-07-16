package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"realtimetransit/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TripRepository struct {
	pool *pgxpool.Pool
}

func NewTripRepository(pool *pgxpool.Pool) *TripRepository {
	return &TripRepository{pool: pool}
}

// GetTripUpdatesByRoute returns the most recent trip update per stop
// per trip for a given route, filtered to the last 300 seconds to
// exclude stale data from previous ingest runs, matching the
// staleness window used for live vehicle positions.
func (r *TripRepository) GetTripUpdatesByRoute(ctx context.Context, routeID string) ([]models.TripUpdate, error) {
	query := `
		SELECT DISTINCT ON (trip_id, stop_id)
			ts,
			trip_id,
			route_id,
			stop_id,
			stop_sequence,
			arrival_delay,
			arrival_time,
			departure_delay,
			departure_time,
			schedule_relationship
		FROM trip_updates
		WHERE route_id = $1
		AND ts > NOW() - INTERVAL '300 seconds'
		ORDER BY trip_id, stop_id, ts DESC
	`

	rows, err := r.pool.Query(ctx, query, routeID)

	if err != nil {
		return nil, fmt.Errorf("Failed querying trip updates for route %s: %w", routeID, err)
	}
	defer rows.Close()

	// Initialize to avoid returning nil
	updates := make([]models.TripUpdate, 0)

	for rows.Next() {
		var u models.TripUpdate
		err := rows.Scan(
			&u.TS,
			&u.TripID,
			&u.RouteID,
			&u.StopID,
			&u.StopSequence,
			&u.ArrivalDelay,
			&u.ArrivalTime,
			&u.DeoartureDelay,
			&u.DepartureTime,
			&u.ScheduleRelationship,
		)
		if err != nil {
			return nil, fmt.Errorf("Failed scanning trip update row: %w", err)
		}
		updates = append(updates, u)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("Failed iterating trip update rows: %w", err)
	}

	return updates, nil
}

func (r *TripRepository) GetTripsByRoute(ctx context.Context, routeID string) ([]models.Trip, error) {
	query := `
		SELECT
			dataset_id,
			trip_id,
			route_id,
			service_id,
			direction_id,
			shape_id,
			trip_headsign,
			wheelchair_accessible,
			bikes_allowed
		FROM trips
		WHERE route_id = $1
		ORDER BY trip_id
	`

	rows, err := r.pool.Query(ctx, query, routeID)
	if err != nil {
		return nil, fmt.Errorf("Failed querying trips for route %s: %w", routeID, err)
	}
	defer rows.Close()

	trips := make([]models.Trip, 0)

	for rows.Next() {
		var t models.Trip
		err := rows.Scan(
			&t.DatasetID,
			&t.TripID,
			&t.RouteID,
			&t.ServiceID,
			&t.DirectionID,
			&t.ShapeID,
			&t.TripHeadsign,
			&t.WheelchairAccessible,
			&t.BikesAllowed,
		)
		if err != nil {
			return nil, fmt.Errorf("Failed scanning trip row: %w", err)
		}
		trips = append(trips, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("Failed iterating trip rows: %w", err)
	}

	return trips, nil
}

// GetAllRouteDelayMetrics returns the average arrival delay and sample size
// for every route that has trip update data in the last 30 minutes.
// Used to compute status icons on the route list page.
// Returns one row per route - routes with no recent data are excluded.
// The caller treats missing routes as status "unknown".
func (r *TripRepository) GetAllRouteDelayMetrics(ctx context.Context) ([]models.RouteDelayMetric, error) {
	query := `
		SELECT
			route_id,
			AVG(arrival_delay)  AS avg_delay,
			COUNT(*)            AS sample_size
		FROM trip_updates
		WHERE ts > NOW() - INTERVAL '30 minutes'
		AND arrival_delay IS NOT NULL
		AND route_id IS NOT NULL
		GROUP BY route_id
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("querying route delay metrics: %w", err)
	}
	defer rows.Close()

	metrics := make([]models.RouteDelayMetric, 0)

	for rows.Next() {
		var m models.RouteDelayMetric
		err := rows.Scan(
			&m.RouteID,
			&m.AvgDelay,
			&m.SampleSize,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning route delay metric row: %w", err)
		}
		metrics = append(metrics, m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating route delay metric rows: %w", err)
	}

	return metrics, nil
}

// GetRouteDelayMetric returns the average arrival delay for a single route
// in the last 30 minutes.
// Returns nil if no data exists for the route in that window.
// Used to compute status and health score on the route detail page.
func (r *TripRepository) GetRouteDelayMetric(ctx context.Context, routeID string) (*models.RouteDelayMetric, error) {
	query := `
		SELECT
			route_id,
			AVG(arrival_delay)  AS avg_delay,
			COUNT(*)            AS sample_size
		FROM trip_updates
		WHERE route_id = $1
		AND ts > NOW() - INTERVAL '30 minutes'
		AND arrival_delay IS NOT NULL
		GROUP BY route_id
	`

	var m models.RouteDelayMetric
	err := r.pool.QueryRow(ctx, query, routeID).Scan(
		&m.RouteID,
		&m.AvgDelay,
		&m.SampleSize,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("querying delay metric for route %s: %w", routeID, err)
	}

	return &m, nil
}

// GetRouteHistory returns time-bucketed average arrival delay
// for a given route between two timestamps.
// Uses TimescaleDB time_bucket() for efficient time-series aggregation.
// bucketInterval is a PostgreSQL interval string e.g. '1 hour', '30 minutes', '1 day'.
func (r *TripRepository) GetRouteHistory(
	ctx context.Context,
	routeID string,
	from time.Time,
	to time.Time,
	bucketInterval string,
) ([]models.HistoryPoint, error) {
	query := fmt.Sprintf(`
		SELECT
			time_bucket('%s', ts) AS bucket,
			AVG(arrival_delay)    AS avg_delay_secs,
			COUNT(*)              AS sample_size
		FROM trip_updates
		WHERE route_id = $1
		AND ts BETWEEN $2 AND $3
		AND arrival_delay IS NOT NULL
		GROUP BY bucket
		ORDER BY bucket ASC
	`, bucketInterval)

	rows, err := r.pool.Query(ctx, query, routeID, from, to)
	if err != nil {
		return nil, fmt.Errorf("querying history for route %s: %w", routeID, err)
	}
	defer rows.Close()

	points := make([]models.HistoryPoint, 0)

	for rows.Next() {
		var p models.HistoryPoint
		err := rows.Scan(
			&p.Bucket,
			&p.AvgDelaySecs,
			&p.SampleSize,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning history point row: %w", err)
		}
		points = append(points, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating history point rows: %w", err)
	}

	return points, nil
}

// GetTripScheduleSummariesByRoute returns schedule summary info for every
// trip on a route: start time, end time, and whether it currently has
// live real-time data. Lets the frontend pick the active or next
// departing trip without guessing.
// start_seconds and end_seconds are seconds since midnight per GTFS spec.
// is_active is true if the trip has a trip_updates row within the last
// 300 seconds, matching the staleness window used for live vehicles.
func (r *TripRepository) GetTripScheduleSummariesByRoute(ctx context.Context, routeID string, datasetID int) ([]models.TripScheduleSummary, error) {
	query := `
		SELECT
			t.trip_id,
			t.direction_id,
			t.trip_headsign,
			MIN(st.arrival_seconds) AS start_seconds,
			MAX(st.arrival_seconds) AS end_seconds,
			EXISTS (
				SELECT 1 FROM trip_updates tu
				WHERE tu.trip_id = t.trip_id
				AND tu.ts > NOW() - INTERVAL '300 seconds'
			) AS is_active
		FROM trips t
		JOIN stop_times st
			ON st.trip_id = t.trip_id
			AND st.dataset_id = t.dataset_id
		WHERE t.route_id = $1
		AND t.dataset_id = $2
		GROUP BY t.trip_id, t.direction_id, t.trip_headsign
		ORDER BY start_seconds ASC
	`

	rows, err := r.pool.Query(ctx, query, routeID, datasetID)
	if err != nil {
		return nil, fmt.Errorf("querying trip schedule summaries for route %s: %w", routeID, err)
	}
	defer rows.Close()

	summaries := make([]models.TripScheduleSummary, 0)

	for rows.Next() {
		var s models.TripScheduleSummary
		err := rows.Scan(
			&s.TripID,
			&s.DirectionID,
			&s.TripHeadsign,
			&s.StartSeconds,
			&s.EndSeconds,
			&s.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning trip schedule summary row: %w", err)
		}
		summaries = append(summaries, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating trip schedule summary rows: %w", err)
	}

	return summaries, nil
}
