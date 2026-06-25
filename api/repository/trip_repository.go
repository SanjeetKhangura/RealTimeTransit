package repository

import (
	"context"
	"fmt"

	"realtimetransit/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TripRepository struct {
	pool *pgxpool.Pool
}

func NewTripRepository(pool *pgxpool.Pool) *TripRepository {
	return &TripRepository{pool: pool}
}

//returns the most recent trip update per trip for <routeID>
func (r *TripRepository) GetTripUpdatesByRoute(ctx context.Context, routeID string) ([]models.TripUpdate, error) {
	query := `
		SELECT
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
		ORDER BY trip_id, ts DESC
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
}s