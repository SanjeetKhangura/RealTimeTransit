package service

import (
	"context"
	"fmt"

	"realtimetransit/models"
	"realtimetransit/repository"
)

type TripService struct {
	tripRepo *repository.TripRepository
}

func NewTripService(tripRepo *repository.TripRepository) *TripService {
	return &TripService{tripRepo: tripRepo}
}

// returns most recent trip update for <routeID>
func (s *TripService) GetTripUpdatesByRoute(ctx context.Context, routeID string) ([]models.TripUpdate, error) {
	updates, err := s.tripRepo.GetTripUpdatesByRoute(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("Failed to get trip updates for route %s: %w", routeID, err)
	}
	return updates, nil
}