package repository

import (
	"context"
	"fmt"

	"realtimetransit/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AlertRepository struct {
	pool *pgxpool.Pool
}

func NewAlertRepository(pool *pgxpool.Pool) *AlertRepository {
	return &AlertRepository{pool: pool}
}

// GetActiveAlertsByRoute returns all currently active service alerts.
// routeID is accepted as a parameter but not yet used in the query
// because the service_alerts table has no route_id column.
// Once the team decides on the schema change this method will be
// updated to filter by route without changing the method signature.
func (r *AlertRepository) GetActiveAlertsByRoute(ctx context.Context, routeID string) ([]models.ServiceAlert, error) {
	query := `
		SELECT DISTINCT ON (alert_id)
			ts,
			alert_id,
			cause,
			effect,
			header_text,
			description_text,
			start_time,
			end_time
		FROM service_alerts
		WHERE (end_time IS NULL OR end_time > NOW())
		ORDER BY alert_id, ts DESC
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("querying active alerts: %w", err)
	}
	defer rows.Close()

	// Initialize as empty slice not nil so JSON returns [] not null
	alerts := make([]models.ServiceAlert, 0)

	for rows.Next() {
		var a models.ServiceAlert
		err := rows.Scan(
			&a.Ts,
			&a.AlertID,
			&a.Cause,
			&a.Effect,
			&a.HeaderText,
			&a.DescriptionText,
			&a.StartTime,
			&a.EndTime,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning alert row: %w", err)
		}
		alerts = append(alerts, a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating alert rows: %w", err)
	}

	return alerts, nil
}
