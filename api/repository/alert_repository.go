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

// GetActiveAlertsByRoute returns all currently active service alerts
// for a given route by joining service_alerts with service_alert_entities.
// Uses DISTINCT ON alert_id to avoid duplicate alerts when one alert
// has multiple entities for the same route.
// Properly filters by route_id using the service_alert_entities table
func (r *AlertRepository) GetActiveAlertsByRoute(ctx context.Context, routeID string) ([]models.ServiceAlert, error) {
	query := `
		SELECT DISTINCT ON (sa.alert_id)
			sa.ts,
			sa.alert_id,
			sa.cause,
			sa.effect,
			sa.header_text,
			sa.description_text,
			sa.start_time,
			sa.end_time
		FROM service_alerts sa
		INNER JOIN service_alert_entities sae
			ON sa.ts = sae.ts
			AND sa.alert_id = sae.alert_id
		WHERE sae.route_id = $1
		AND (sa.end_time IS NULL OR sa.end_time > NOW())
		ORDER BY sa.alert_id, sa.ts DESC
	`

	rows, err := r.pool.Query(ctx, query, routeID)
	if err != nil {
		return nil, fmt.Errorf("querying active alerts for route %s: %w", routeID, err)
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

// GetSystemWideAlerts returns all currently active alerts that apply
// to the entire agency with no specific route, trip, or stop entity.
// These are alerts that affect the whole transit network.
// Used by GET /api/alerts/system
func (r *AlertRepository) GetSystemWideAlerts(ctx context.Context) ([]models.ServiceAlert, error) {
	query := `
		SELECT DISTINCT ON (sa.alert_id)
			sa.ts,
			sa.alert_id,
			sa.cause,
			sa.effect,
			sa.header_text,
			sa.description_text,
			sa.start_time,
			sa.end_time
		FROM service_alerts sa
		INNER JOIN service_alert_entities sae
			ON sa.ts = sae.ts
			AND sa.alert_id = sae.alert_id
		WHERE sae.agency_id IS NOT NULL
		AND sae.route_id IS NULL
		AND sae.trip_id IS NULL
		AND sae.stop_id IS NULL
		AND (sa.end_time IS NULL OR sa.end_time > NOW())
		ORDER BY sa.alert_id, sa.ts DESC
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("querying system wide alerts: %w", err)
	}
	defer rows.Close()

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
			return nil, fmt.Errorf("scanning system wide alert row: %w", err)
		}
		alerts = append(alerts, a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating system wide alert rows: %w", err)
	}

	return alerts, nil
}

// GetAllActiveAlerts returns all currently active alerts regardless of
// which route, trip, stop, or agency they apply to.
// Used by GET /api/alerts
func (r *AlertRepository) GetAllActiveAlerts(ctx context.Context) ([]models.ServiceAlert, error) {
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
		return nil, fmt.Errorf("querying all active alerts: %w", err)
	}
	defer rows.Close()

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
