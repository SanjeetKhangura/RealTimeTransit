package dto

import (
	"testing"
	"time"

	"realtimetransit/models"
)

func TestToLiveVehiclesResponse(t *testing.T) {
	routeID := "route1"
	lastUpdated := time.Now()

	tests := []struct {
		name         string
		positions    []models.VehiclePosition
		expectedData string
	}{
		{
			name:         "No vehicles returns scheduled",
			positions:    []models.VehiclePosition{},
			expectedData: "scheduled",
		},
		{
			name: "One vehicle returns realtime",
			positions: []models.VehiclePosition{
				{
					VehicleID: "vehicle1",
					Ts:        lastUpdated,
				},
			},
			expectedData: "realtime",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := ToLiveVehiclesResponse(routeID, tt.positions, &lastUpdated)
			if response.DataSource != tt.expectedData {
				t.Errorf("ToLiveVehiclesResponse() = %v; want %v", response.DataSource, tt.expectedData)
			}
			if response.RouteID != routeID {
				t.Errorf("ToLiveVehiclesResponse() = %v; want %v", response.RouteID, routeID)
			}
			if len(response.Vehicles) != len(tt.positions) {
				t.Errorf("ToLiveVehiclesResponse() = %v; want %v", len(response.Vehicles), len(tt.positions))
			}
			if response.LastUpdated == nil || !response.LastUpdated.Equal(lastUpdated) {
				t.Errorf("ToLiveVehiclesResponse() = %v; want %v", response.LastUpdated, lastUpdated)
			}
		})
	}
}