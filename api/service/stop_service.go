package service

import (
	"context"
	"fmt"

	"realtimetransit/models"
	"realtimetransit/repository"
)

type StopService struct {
	stopRepo  *repository.StopRepository
	routeRepo *repository.RouteRepository
}

func NewStopService(
	stopRepo *repository.StopRepository,
	routeRepo *repository.RouteRepository,
) *StopService {
	return &StopService{
		stopRepo:  stopRepo,
		routeRepo: routeRepo,
	}
}

// GetStopsWithTimesByRoute returns all stops for a given route
// with scheduled arrival times and latest real-time delay if available.
// Resolves the latest dataset_id before querying stops.
func (s *StopService) GetStopsWithTimesByRoute(ctx context.Context, routeID string) ([]models.StopWithTimes, error) {
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting latest dataset: %w", err)
	}

	stops, err := s.stopRepo.GetStopsWithTimesByRoute(ctx, routeID, datasetID)
	if err != nil {
		return nil, fmt.Errorf("getting stops for route %s: %w", routeID, err)
	}

	return stops, nil
}

// GetStopsWithTimesByTrip returns all stops for a given trip with
// scheduled arrival times and latest real-time delay if available,
// filtered to the last 300 seconds to exclude stale data.
// Called by GET /api/routes/{id}/stops?trip_id=...
func (s *StopService) GetStopsWithTimesByTrip(ctx context.Context, tripID string) ([]models.StopWithTimes, error) {
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting latest dataset: %w", err)
	}

	stops, err := s.stopRepo.GetStopsWithTimesByTrip(ctx, tripID, datasetID)
	if err != nil {
		return nil, fmt.Errorf("getting stops for trip %s: %w", tripID, err)
	}

	return stops, nil
}
