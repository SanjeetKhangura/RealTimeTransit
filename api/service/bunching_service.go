package service

import (
	"context"
	"fmt"
	"realtimetransit/models"
	"realtimetransit/repository"
)

const maxDistanceThreshold = 500.0 // meters

type BunchingService struct {
	bunchingRepo *repository.BunchingRepository
	routeRepo   *repository.RouteRepository
}

func NewBunchingService(bunchingRepo *repository.BunchingRepository, routeRepo *repository.RouteRepository) *BunchingService {
	return &BunchingService{
		bunchingRepo: bunchingRepo,
		routeRepo:   routeRepo,
	}
}

func (s *BunchingService) GetBunchingPairsByRoute(ctx context.Context, routeID string) ([]models.BunchingPair, error){
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return nil, fmt.Errorf("Error getting latest dataset ID for route %s: %w", routeID, err)
	}

	pairs, err := s.bunchingRepo.GetBunchingPairsByRoute(ctx, routeID, datasetID, maxDistanceThreshold)
	if err != nil {
		return nil, fmt.Errorf("Error getting bunching pairs for route %s: %w", routeID, err)
	}

	// Calculate severity for each pair based on distance
	for i := range pairs {
		pairs[i].Severity = calculateSeverity(pairs[i].DistanceAlongRoute)
	}

	return pairs, nil
}

// calculateSeverity determines the severity of bunching based on the distance between vehicles.
// - Severe: distance < 100 meters
// - Warning: 100 meters <= distance < 300 meters
// - Normal: distance >= 300 meters
func calculateSeverity(distance float64) string {
	if distance < 100 {
		return "alert"
	} else if distance < 300 {
		return "warning"
	} else {
		return "advisory"
	}
}