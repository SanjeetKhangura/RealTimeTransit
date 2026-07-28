package service

import (
	"context"
	"fmt"
	"time"

	"realtimetransit/models"
	"realtimetransit/repository"
)

// RouteService handles business logic for routes.
type RouteService struct {
	routeRepo   *repository.RouteRepository
	vehicleRepo *repository.VehicleRepository
	tripRepo    *repository.TripRepository
}

// NewRouteService creates a new RouteService.
func NewRouteService(
	routeRepo *repository.RouteRepository,
	vehicleRepo *repository.VehicleRepository,
	tripRepo *repository.TripRepository,
) *RouteService {
	return &RouteService{
		routeRepo:   routeRepo,
		vehicleRepo: vehicleRepo,
		tripRepo:    tripRepo,
	}
}

// RouteWithStatus holds a route with its computed status and health score.
type RouteWithStatus struct {
	Route       models.Route
	Status      string
	HealthScore float64
}

// GetAllRoutes returns all routes with computed status and health score.
// Fetches delay metrics in one query for all routes then computes
// status per route in memory — avoids N+1 queries.
func (s *RouteService) GetAllRoutes(ctx context.Context) ([]RouteWithStatus, error) {
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting latest dataset: %w", err)
	}

	routes, err := s.routeRepo.GetAllRoutes(ctx, datasetID)
	if err != nil {
		return nil, fmt.Errorf("getting all routes: %w", err)
	}

	// Fetch all delay metrics in one query
	metrics, err := s.tripRepo.GetAllRouteDelayMetrics(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting route delay metrics: %w", err)
	}

	// Build a map for O(1) lookup
	metricMap := make(map[string]*models.RouteDelayMetric, len(metrics))
	for i := range metrics {
		metricMap[metrics[i].RouteID] = &metrics[i]
	}

	// Combine routes with their status
	result := make([]RouteWithStatus, len(routes))
	for i, route := range routes {
		metric := metricMap[route.RouteID]
		result[i] = RouteWithStatus{
			Route:       route,
			Status:      computeStatus(metric),
			HealthScore: computeHealthScore(metric),
		}
	}

	return result, nil
}

// RouteDetail holds a route with freshness metadata and status.
type RouteDetail struct {
	Route       models.Route
	LastUpdated *time.Time
	Status      string
	HealthScore float64
}

// GetRouteByID returns a single route with status and freshness metadata.
func (s *RouteService) GetRouteByID(ctx context.Context, routeID string) (RouteDetail, error) {
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return RouteDetail{}, fmt.Errorf("getting latest dataset: %w", err)
	}

	route, err := s.routeRepo.GetRouteByID(ctx, datasetID, routeID)
	if err != nil {
		return RouteDetail{}, fmt.Errorf("getting route %s: %w", routeID, err)
	}

	lastUpdated, err := s.vehicleRepo.GetLatestUpdateTime(ctx, routeID)
	if err != nil {
		return RouteDetail{}, fmt.Errorf("getting latest update time for route %s: %w", routeID, err)
	}

	metric, err := s.tripRepo.GetRouteDelayMetric(ctx, routeID)
	if err != nil {
		return RouteDetail{}, fmt.Errorf("getting delay metric for route %s: %w", routeID, err)
	}

	return RouteDetail{
		Route:       route,
		LastUpdated: lastUpdated,
		Status:      computeStatus(metric),
		HealthScore: computeHealthScore(metric),
	}, nil
}
