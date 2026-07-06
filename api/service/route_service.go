package service

import (
	"context"
	"fmt"
	"time"

	"realtimetransit/models"
	"realtimetransit/repository"
)

type RouteService struct {
	routeRepo   *repository.RouteRepository
	vehicleRepo *repository.VehicleRepository
}

func NewRouteService(
	routeRepo *repository.RouteRepository,
	vehicleRepo *repository.VehicleRepository,
) *RouteService {
	return &RouteService{
		routeRepo:   routeRepo,
		vehicleRepo: vehicleRepo,
	}
}

func (s *RouteService) GetAllRoutes(ctx context.Context) ([]models.Route, error) {
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting latest dataset: %w", err)
	}

	routes, err := s.routeRepo.GetAllRoutes(ctx, datasetID)
	if err != nil {
		return nil, fmt.Errorf("getting all routes: %w", err)
	}

	return routes, nil
}

// RouteDetail holds a route with its freshness metadata.
type RouteDetail struct {
	Route       models.Route
	LastUpdated *time.Time
}

// GetRouteByID returns a single route with freshness metadata.
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

	return RouteDetail{
		Route:       route,
		LastUpdated: lastUpdated,
	}, nil
}
