package service

import (
	"context"
	"fmt"

	"realtimetransit/models"
	"realtimetransit/repository"
)

type AlertService struct {
	alertRepo *repository.AlertRepository
}

func NewAlertService(alertRepo *repository.AlertRepository) *AlertService {
	return &AlertService{alertRepo: alertRepo}
}

// GetActiveAlertsByRoute returns all currently active service alerts.
// routeID is passed through to the repository but not yet used for
// filtering as the service_alerts table has no route_id column.
// Once the schema is updated this will return only alerts for the
// given route without any changes needed in this layer.
func (s *AlertService) GetActiveAlertsByRoute(ctx context.Context, routeID string) ([]models.ServiceAlert, error) {
	alerts, err := s.alertRepo.GetActiveAlertsByRoute(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("getting active alerts for route %s: %w", routeID, err)
	}

	return alerts, nil
}

// GetSystemWideAlerts returns all active alerts that apply to the
// entire agency with no specific route, trip, or stop.
// Called by GET /api/alerts/system
func (s *AlertService) GetSystemWideAlerts(ctx context.Context) ([]models.ServiceAlert, error) {
	alerts, err := s.alertRepo.GetSystemWideAlerts(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting system wide alerts: %w", err)
	}
	return alerts, nil
}

// GetAllActiveAlerts returns all currently active alerts across the
// entire transit network regardless of route, trip, or stop.
// Called by GET /api/alerts
func (s *AlertService) GetAllActiveAlerts(ctx context.Context) ([]models.ServiceAlert, error) {
	alerts, err := s.alertRepo.GetAllActiveAlerts(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting all active alerts: %w", err)
	}
	return alerts, nil
}
