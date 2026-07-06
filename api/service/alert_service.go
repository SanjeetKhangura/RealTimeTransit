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
