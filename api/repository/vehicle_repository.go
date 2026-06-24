package repository

import (
	"context"
	"fmt"

	"realtimetransit/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type VehicleRepository struct {
	pool *pgxpool.Pool
}

func NewVehicleRepository(pool *pgxpool.Pool) *VehicleRepository {
	return &VehicleRepository{pool: pool}
}

// GetLatestPositionsByRoute returns the most recent position per vehicle
// for a given route within the last 5 minutes.
// Uses DISTINCT ON to get one row per vehicle ordered by most recent timestamp.
// Vehicles that have not reported in 5 minutes are considered inactive
// and excluded from results.
func (r *VehicleRepository) GetLatestPositionsByRoute(ctx context.Context, routeID string) ([]models.VehiclePosition, error) {
	query := `
		SELECT DISTINCT ON (vehicle_id)
			ts,
			vehicle_id,
			trip_id,
			route_id,
			lat,
			lon,
			bearing,
			speed,
			current_status,
			current_stop_sequence,
			stop_id,
			congestion_level
		FROM vehicle_positions
		WHERE route_id = $1
		AND ts > NOW() - INTERVAL '5 minutes'
		ORDER BY vehicle_id, ts DESC
	`

	rows, err := r.pool.Query(ctx, query, routeID)
	if err != nil {
		return nil, fmt.Errorf("querying vehicle positions for route %s: %w", routeID, err)
	}
	defer rows.Close()

	// Initialize as empty slice not nil so JSON returns [] not null
	positions := make([]models.VehiclePosition, 0)

	for rows.Next() {
		var p models.VehiclePosition
		err := rows.Scan(
			&p.Ts,
			&p.VehicleID,
			&p.TripID,
			&p.RouteID,
			&p.Lat,
			&p.Lon,
			&p.Bearing,
			&p.Speed,
			&p.CurrentStatus,
			&p.CurrentStopSequence,
			&p.StopID,
			&p.CongestionLevel,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning vehicle position row: %w", err)
		}
		positions = append(positions, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating vehicle position rows: %w", err)
	}

	return positions, nil
}
