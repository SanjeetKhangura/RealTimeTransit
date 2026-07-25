package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"realtimetransit/models"
)

type BunchingRepository struct {
	db *pgxpool.Pool
}

func NewBunchingRepository(db *pgxpool.Pool) *BunchingRepository {
	return &BunchingRepository{
		db: db,
	}
}

func (r *BunchingRepository) GetBunchingPairsByRoute(ctx context.Context, routeID string, datasetID int, distanceThreshold float64) ([]models.BunchingPair, error) {
	// Get the latest positions of vehicles on the given route in the last 2 minutes.
	// Join those positions with trips and shape paths to get the progress along the route.
	// Pair up vehicles that are on the same route, direction, and shape, and calculate the distance between them along the route.
	// Return pairs of vehicles that are within a certain distance threshold (defined from parameter) of each other.	
	const query = `
		WITH latest_positions AS (
			SELECT DISTINCT ON (vp.vehicle_id)
				vp.vehicle_id,
				vp.trip_id,
				vp.route_id,
				vp.ts,
				COALESCE(
					vp.geom,
					CASE
						WHEN vp.lon IS NOT NULL
						 AND vp.lat IS NOT NULL
						THEN ST_SetSRID(
							ST_MakePoint(vp.lon, vp.lat),
							4326
						)
					END
				) AS position_geom
			FROM vehicle_positions vp
			WHERE vp.route_id = $1
			  AND vp.ts >= NOW() - INTERVAL '2 minutes'
			ORDER BY vp.vehicle_id, vp.ts DESC
		),
		located_vehicles AS (
			SELECT
				lp.vehicle_id,
				lp.trip_id,
				lp.route_id,
				lp.ts,
				t.direction_id,
				t.shape_id,
				sp.geom AS shape_geom,
				ST_LineLocatePoint(
					sp.geom,
					lp.position_geom
				) AS progress
			FROM latest_positions lp
			JOIN trips t
			  ON t.dataset_id = $2
			 AND t.trip_id = lp.trip_id
			 AND t.route_id = lp.route_id
			JOIN shape_paths sp
			  ON sp.dataset_id = t.dataset_id
			 AND sp.shape_id = t.shape_id
			WHERE lp.position_geom IS NOT NULL
			  AND t.shape_id IS NOT NULL
			  AND ST_DWithin(
				  sp.geom::geography,
				  lp.position_geom::geography,
				  200
			  )
		),
		pair_distances AS (
			SELECT
				first_vehicle.route_id,
				first_vehicle.direction_id,
				first_vehicle.shape_id,

				first_vehicle.vehicle_id
					AS first_vehicle_id,
				second_vehicle.vehicle_id
					AS second_vehicle_id,

				first_vehicle.trip_id
					AS first_trip_id,
				second_vehicle.trip_id
					AS second_trip_id,

				first_vehicle.progress
					AS first_progress,
				second_vehicle.progress
					AS second_progress,

				ST_Length(
					ST_LineSubstring(
						first_vehicle.shape_geom,
						LEAST(
							first_vehicle.progress,
							second_vehicle.progress
						),
						GREATEST(
							first_vehicle.progress,
							second_vehicle.progress
						)
					)::geography
				) AS distance_along_route_meters,

				GREATEST(
					first_vehicle.ts,
					second_vehicle.ts
				) AS detected_at
			FROM located_vehicles first_vehicle
			JOIN located_vehicles second_vehicle
			  ON first_vehicle.vehicle_id <
			     second_vehicle.vehicle_id
			 AND first_vehicle.direction_id
			     IS NOT DISTINCT FROM
			     second_vehicle.direction_id
			 AND first_vehicle.shape_id =
			     second_vehicle.shape_id
		)
		SELECT
			route_id,
			direction_id,
			shape_id,

			CASE
				WHEN first_progress >= second_progress
				THEN first_vehicle_id
				ELSE second_vehicle_id
			END AS leading_vehicle_id,

			CASE
				WHEN first_progress >= second_progress
				THEN second_vehicle_id
				ELSE first_vehicle_id
			END AS following_vehicle_id,

			CASE
				WHEN first_progress >= second_progress
				THEN first_trip_id
				ELSE second_trip_id
			END AS leading_trip_id,

			CASE
				WHEN first_progress >= second_progress
				THEN second_trip_id
				ELSE first_trip_id
			END AS following_trip_id,

			distance_along_route_meters,

			GREATEST(
				first_progress,
				second_progress
			) AS leading_progress,

			LEAST(
				first_progress,
				second_progress
			) AS following_progress,

			detected_at
		FROM pair_distances
		WHERE distance_along_route_meters <= $3
		ORDER BY distance_along_route_meters
	`

	rows, err := r.db.Query(ctx, query, routeID, datasetID, distanceThreshold)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	pairs := make([]models.BunchingPair, 0)
	for rows.Next() {
		var pair models.BunchingPair
		if err := rows.Scan(
			&pair.RouteID,
			&pair.DirectionID,
			&pair.ShapeID,
			&pair.LeadingVehicleID,
			&pair.FollowingVehicleID,
			&pair.LeadingTripID,
			&pair.FollowingTripID,
			&pair.DistanceAlongRoute,
			&pair.LeadingProgress,
			&pair.FollowingProgress,
			&pair.DetectedAt,
		); err != nil {
			return nil, fmt.Errorf("Error scanning bunching pair row: %w", err)
		}
		pairs = append(pairs, pair)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("Error iterating rows: %w", err)
	}

	return pairs, nil
}