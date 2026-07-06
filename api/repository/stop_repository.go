package repository

import (
	"context"
	"fmt"

	"realtimetransit/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StopRepository struct {
	pool *pgxpool.Pool
}

func NewStopRepository(pool *pgxpool.Pool) *StopRepository {
	return &StopRepository{pool: pool}
}

// GetStopsWithTimesByRoute returns all stops for a given route
// joined with their scheduled arrival times from stop_times
// and the latest real-time arrival delay from trip_updates if available.
// arrival_seconds is seconds since midnight per GTFS spec.
// arrival_delay is seconds of delay from trip_updates, null if no real-time data.
func (r *StopRepository) GetStopsWithTimesByRoute(ctx context.Context, routeID string, datasetID int) ([]models.StopWithTimes, error) {
	query := `
		SELECT DISTINCT ON (st.stop_id, st.stop_sequence)
			s.stop_id,
			s.stop_name,
			s.stop_lat,
			s.stop_lon,
			s.stop_code,
			s.stop_desc,
			s.wheelchair_boarding,
			st.stop_sequence,
			st.arrival_seconds,
			st.departure_seconds,
			tu.arrival_delay,
			tu.arrival_time
		FROM stop_times st
		JOIN trips t
			ON st.trip_id = t.trip_id
			AND st.dataset_id = t.dataset_id
		JOIN stops s
			ON st.stop_id = s.stop_id
			AND st.dataset_id = s.dataset_id
		LEFT JOIN LATERAL (
			SELECT arrival_delay, arrival_time
			FROM trip_updates
			WHERE trip_updates.stop_id = st.stop_id
			AND trip_updates.route_id = $1
			ORDER BY ts DESC
			LIMIT 1
		) tu ON true
		WHERE t.route_id = $1
		AND t.dataset_id = $2
		ORDER BY st.stop_id, st.stop_sequence, st.arrival_seconds ASC
	`

	rows, err := r.pool.Query(ctx, query, routeID, datasetID)
	if err != nil {
		return nil, fmt.Errorf("querying stops for route %s: %w", routeID, err)
	}
	defer rows.Close()

	// Initialize as empty slice not nil so JSON returns [] not null
	stops := make([]models.StopWithTimes, 0)

	for rows.Next() {
		var sw models.StopWithTimes
		err := rows.Scan(
			&sw.StopID,
			&sw.StopName,
			&sw.StopLat,
			&sw.StopLon,
			&sw.StopCode,
			&sw.StopDesc,
			&sw.WheelchairBoarding,
			&sw.StopSequence,
			&sw.ArrivalSeconds,
			&sw.DepartureSeconds,
			&sw.ArrivalDelay,
			&sw.ArrivalTime,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning stop row: %w", err)
		}
		stops = append(stops, sw)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating stop rows: %w", err)
	}

	return stops, nil
}
