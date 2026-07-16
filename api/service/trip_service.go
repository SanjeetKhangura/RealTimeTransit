package service

import (
	"context"
	"fmt"

	"realtimetransit/models"
	"realtimetransit/repository"
)

type TripService struct {
	tripRepo  *repository.TripRepository
	routeRepo *repository.RouteRepository
}

func NewTripService(tripRepo *repository.TripRepository, routeRepo *repository.RouteRepository) *TripService {
	return &TripService{
		tripRepo:  tripRepo,
		routeRepo: routeRepo,
	}
}

// returns most recent trip update for <routeID>
func (s *TripService) GetTripUpdatesByRoute(ctx context.Context, routeID string) ([]models.TripUpdate, error) {
	updates, err := s.tripRepo.GetTripUpdatesByRoute(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("Failed to get trip updates for route %s: %w", routeID, err)
	}
	return updates, nil
}

// returns all trips for <routeID>
func (s *TripService) GetTripsByRoute(ctx context.Context, routeID string) ([]models.Trip, error) {
	trips, err := s.tripRepo.GetTripsByRoute(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("Failed to get trips for route %s: %w", routeID, err)
	}
	return trips, nil
}

// GetTripScheduleSummariesByRoute returns schedule summary info for
// every trip on a route so the frontend can choose the active or
// next departing trip.
// Called by GET /api/routes/{id}/trips/schedule
func (s *TripService) GetTripScheduleSummariesByRoute(ctx context.Context, routeID string) ([]models.TripScheduleSummary, error) {
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting latest dataset: %w", err)
	}

	summaries, err := s.tripRepo.GetTripScheduleSummariesByRoute(ctx, routeID, datasetID)
	if err != nil {
		return nil, fmt.Errorf("getting trip schedule summaries for route %s: %w", routeID, err)
	}
	return summaries, nil
}
