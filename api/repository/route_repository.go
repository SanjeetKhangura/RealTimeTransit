package repository

import (
	"context"
	"errors"
	"fmt"

	"realtimetransit/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RouteRepository struct {
	pool *pgxpool.Pool
}

func NewRouteRepository(pool *pgxpool.Pool) *RouteRepository {
	return &RouteRepository{pool: pool}
}

// GetLatestDatasetID returns the most recently imported GTFS dataset ID.
// Every route, trip, and stop query needs this to know which
// version of the static schedule is currently active.
func (r *RouteRepository) GetLatestDatasetID(ctx context.Context) (int, error) {
	var datasetID int

	query := `
		SELECT dataset_id
		FROM gtfs_datasets
		ORDER BY import_date DESC
		LIMIT 1
	`

	err := r.pool.QueryRow(ctx, query).Scan(&datasetID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, fmt.Errorf("no GTFS dataset found, static schedule has not been imported yet")
		}
		return 0, fmt.Errorf("getting latest dataset id: %w", err)
	}

	return datasetID, nil
}

func (r *RouteRepository) GetAllRoutes(ctx context.Context, datasetID int) ([]models.Route, error) {
	query := `
		SELECT
			dataset_id,
			route_id,
			route_short_name,
			route_long_name,
			route_type
		FROM routes
		WHERE dataset_id = $1
		ORDER BY route_short_name ASC
	`

	rows, err := r.pool.Query(ctx, query, datasetID)
	if err != nil {
		return nil, fmt.Errorf("querying all routes: %w", err)
	}
	defer rows.Close()

	// Initialize as empty slice not nil
	// This ensures the JSON response returns [] not null
	// when there are no routes in the dataset
	routes := make([]models.Route, 0)

	for rows.Next() {
		var route models.Route
		err := rows.Scan(
			&route.DatasetID,
			&route.RouteID,
			&route.ShortName,
			&route.LongName,
			&route.RouteType,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning route row: %w", err)
		}
		routes = append(routes, route)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating route rows: %w", err)
	}

	return routes, nil
}

func (r *RouteRepository) GetRouteByID(ctx context.Context, datasetID int, routeID string) (models.Route, error) {
	query := `
		SELECT
			dataset_id,
			route_id,
			route_short_name,
			route_long_name,
			route_type
		FROM routes
		WHERE dataset_id = $1
		AND route_id = $2
	`

	var route models.Route
	err := r.pool.QueryRow(ctx, query, datasetID, routeID).Scan(
		&route.DatasetID,
		&route.RouteID,
		&route.ShortName,
		&route.LongName,
		&route.RouteType,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Route{}, fmt.Errorf("route %s not found", routeID)
		}
		return models.Route{}, fmt.Errorf("getting route %s: %w", routeID, err)
	}

	return route, nil
}
