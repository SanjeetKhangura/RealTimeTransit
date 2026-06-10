package service

import (
	"context"
	"fmt"

	"realtimetransit/models"
	"realtimetransit/repository"
)

type RouteService struct {
	routeRepo *repository.RouteRepository
}

func NewRouteService(routeRepo *repository.RouteRepository) *RouteService {
	return &RouteService{routeRepo: routeRepo}
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

func (s *RouteService) GetRouteByID(ctx context.Context, routeID string) (models.Route, error) {
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return models.Route{}, fmt.Errorf("getting latest dataset: %w", err)
	}

	route, err := s.routeRepo.GetRouteByID(ctx, datasetID, routeID)
	if err != nil {
		return models.Route{}, fmt.Errorf("getting route %s: %w", routeID, err)
	}

	return route, nil
}
