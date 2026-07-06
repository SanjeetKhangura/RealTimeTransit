package service

import (
	"context"
	"fmt"
	"time"

	"realtimetransit/models"
	"realtimetransit/repository"
)

type VehicleService struct {
	vehicleRepo *repository.VehicleRepository
}

func NewVehicleService(vehicleRepo *repository.VehicleRepository) *VehicleService {
	return &VehicleService{vehicleRepo: vehicleRepo}
}

type LiveVehicleData struct {
	Positions   []models.VehiclePosition
	LastUpdated *time.Time
}

// / GetLiveVehiclesByRoute returns the latest position for each active
// vehicle on a given route along with freshness metadata.
// A vehicle is considered active if it has reported in the last 5 minutes.
func (s *VehicleService) GetLiveVehiclesByRoute(ctx context.Context, routeID string) (LiveVehicleData, error) {
	positions, err := s.vehicleRepo.GetLatestPositionsByRoute(ctx, routeID)
	if err != nil {
		return LiveVehicleData{}, fmt.Errorf("getting live vehicles for route %s: %w", routeID, err)
	}

	lastUpdated, err := s.vehicleRepo.GetLatestUpdateTime(ctx, routeID)
	if err != nil {
		return LiveVehicleData{}, fmt.Errorf("getting latest update time for route %s: %w", routeID, err)
	}

	return LiveVehicleData{
		Positions:   positions,
		LastUpdated: lastUpdated,
	}, nil
}
