package service

import (
	"context"
	"fmt"

	"realtimetransit/models"
	"realtimetransit/repository"
)

type VehicleService struct {
	vehicleRepo *repository.VehicleRepository
}

func NewVehicleService(vehicleRepo *repository.VehicleRepository) *VehicleService {
	return &VehicleService{vehicleRepo: vehicleRepo}
}

// GetLiveVehiclesByRoute returns the latest position for each active
// vehicle on a given route.
// A vehicle is considered active if it has reported in the last 5 minutes.
func (s *VehicleService) GetLiveVehiclesByRoute(ctx context.Context, routeID string) ([]models.VehiclePosition, error) {
	positions, err := s.vehicleRepo.GetLatestPositionsByRoute(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("getting live vehicles for route %s: %w", routeID, err)
	}

	return positions, nil
}
