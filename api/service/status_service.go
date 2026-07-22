package service

import(
	"context"
	"fmt"
	"math"
	"time"
	
	"realtimetransit/models"
	"realtimetransit/repository"
)

// Status constants used across route list and route detail responses.
const (
	StatusOnTime      = "on_time"
	StatusMinorDelays = "minor_delays"
	StatusDisrupted   = "disrupted"
	StatusUnknown     = "unknown"
)

// Delay thresholds in seconds.
// These match the configurable thresholds from the requirements doc.
// When the admin threshold configuration is built these will be
// read from config instead of being hardcoded here.
const (
	minorDelayThresholdSecs = 120.0 // 2 minutes
	disruptedThresholdSecs  = 300.0 // 5 minutes
)

// StatusService handles business logic for route status
type StatusService struct {
	tripRepo    *repository.TripRepository
	vehicleRepo *repository.VehicleRepository
	alertRepo   *repository.AlertRepository
	routeRepo   *repository.RouteRepository
}

func NewStatusService(
	tripRepo *repository.TripRepository,
	vehicleRepo *repository.VehicleRepository,
	alertRepo *repository.AlertRepository,
	routeRepo *repository.RouteRepository,
) *StatusService {
	return &StatusService{
		tripRepo:    tripRepo,
		vehicleRepo: vehicleRepo,
		alertRepo:   alertRepo,
		routeRepo:   routeRepo,
	}
}

// computeStatus derives a route status string from average delay seconds.
// Called for both the route list and route detail endpoints.
func computeStatus(metric *models.RouteDelayMetric) string {
	if metric == nil {
		return StatusUnknown
	}
	if metric.AvgDelay >= disruptedThresholdSecs {
		return StatusDisrupted
	}
	if metric.AvgDelay >= minorDelayThresholdSecs {
		return StatusMinorDelays
	}
	return StatusOnTime
}

// computeHealthScore derives a 0.0 to 5.0 health score from average delay.
// Returns 0.0 when no data is available.
// This is a temporary implementation based on trip_updates data.
func computeHealthScore(metric *models.RouteDelayMetric) float64 {
	if metric == nil {
		return 0.0
	}

	avgDelay := metric.AvgDelay

	switch {
	case avgDelay < 0:
		// Running early — still healthy
		return 5.0
	case avgDelay < 60:
		return 5.0
	case avgDelay < 120:
		return 4.0
	case avgDelay < 180:
		return 3.5
	case avgDelay < 300:
		return 2.5
	case avgDelay < 600:
		return 1.5
	default:
		return 1.0
	}
}

func (s *StatusService) GetRouteStatus(ctx context.Context, routeID string) (models.RouteStatus, error) {
	// Get the latest delay metric for the route
	metric, err := s.tripRepo.GetRouteDelayMetric(ctx, routeID)
	if err != nil {
		return models.RouteStatus{}, fmt.Errorf("Error getting route delay metric for route %s: %w", routeID, err)
	}

	vehicles, err := s.vehicleRepo.GetLatestPositionsByRoute(ctx, routeID)
	if err != nil {
		return models.RouteStatus{}, fmt.Errorf("Error getting latest positions for route %s: %w", routeID, err)
	}

	// Get the active alerts for the route
	alerts, err := s.alertRepo.GetActiveAlertsByRoute(ctx, routeID)
	if err != nil {
		return models.RouteStatus{}, fmt.Errorf("Error getting active alerts for route %s: %w", routeID, err)
	}

	status := computeStatus(metric)
	healthScore := computeHealthScore(metric)

	// If there are alerts, change to disrupted status
	if len(alerts) > 0 {
		status = StatusDisrupted
	}

	result := models.RouteStatus{
		RouteID:      routeID,
		Status:       status,
		VehicleCount: len(vehicles),
		AlertCount:   len(alerts),
		HealthScore:  healthScore,
		LastUpdated:  time.Now().UTC(),
	}

	if metric != nil {
		result.AvgDelay = int(math.Round(metric.AvgDelay))
		result.SampleSize = metric.SampleSize
	}

	return result, nil
}

// retrieves the status for all routes in the system and caches the results for better performance
func (s *StatusService) GetAllRouteStatuses(ctx context.Context) ([]models.RouteStatus, error) {
	// Get the latest dataset ID
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return nil, fmt.Errorf("Error getting latest dataset ID: %w", err)
	}

	// Get all route IDs from the route repository
	routes, err := s.routeRepo.GetAllRoutes(ctx, datasetID)
	if err != nil {
		return nil, fmt.Errorf("Error getting all routes: %w", err)
	}

	statuses := make([]models.RouteStatus, 0, len(routes))
	
	for _, route := range routes {
		status, err := s.GetRouteStatus(ctx, route.RouteID)
		if err != nil {
			return nil, fmt.Errorf("Error getting status for route %s: %w", route.RouteID, err)
		}
		statuses = append(statuses, status)
	}

	return statuses, nil
}