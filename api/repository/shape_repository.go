package repository

import (
	"context"
	"fmt"

	"realtimetransit/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ShapeRepository struct {
	pool *pgxpool.Pool
}

func NewShapeRepository(pool *pgxpool.Pool) *ShapeRepository {
	return &ShapeRepository{pool: pool}
}

// GetMostCommonShapeIDForRoute returns the most frequently used shape_id
// across all trips for the given route and dataset.
// A route can have multiple shapes (per direction or pattern) so we pick
// the most common one as the representative shape for the map polyline.
func (r *ShapeRepository) GetMostCommonShapeIDForRoute(ctx context.Context, routeID string, datasetID int) (string, error) {
	query := `
		SELECT shape_id
		FROM trips
		WHERE route_id = $1
		AND dataset_id = $2
		AND shape_id IS NOT NULL
		GROUP BY shape_id
		ORDER BY COUNT(*) DESC
		LIMIT 1
	`

	var shapeID string
	err := r.pool.QueryRow(ctx, query, routeID, datasetID).Scan(&shapeID)
	if err != nil {
		return "", fmt.Errorf("getting most common shape_id for route %s: %w", routeID, err)
	}

	return shapeID, nil
}

// GetShapePoints returns all points for a given shape from shape_paths
// materialized view, decomposed from the LineString into individual
// lat/lon coordinates ordered by sequence.
// Returns [lat, lon] pairs
func (r *ShapeRepository) GetShapePoints(ctx context.Context, shapeID string, datasetID int) ([]models.ShapePoint, error) {
	query := `
		SELECT
			ST_Y(geom)                               AS lat,
			ST_X(geom)                               AS lon,
			generate_series(1, ST_NumPoints(geom))   AS sequence
		FROM (
			SELECT
				ST_PointN(geom, generate_series(1, ST_NumPoints(geom))) AS geom
			FROM shape_paths
			WHERE shape_id = $1
			AND dataset_id = $2
		) points
	`

	rows, err := r.pool.Query(ctx, query, shapeID, datasetID)
	if err != nil {
		return nil, fmt.Errorf("querying shape points for shape %s: %w", shapeID, err)
	}
	defer rows.Close()

	points := make([]models.ShapePoint, 0)

	for rows.Next() {
		var p models.ShapePoint
		err := rows.Scan(
			&p.Lat,
			&p.Lon,
			&p.Sequence,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning shape point row: %w", err)
		}
		points = append(points, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating shape point rows: %w", err)
	}

	return points, nil
}
