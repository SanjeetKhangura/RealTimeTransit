package dto

import (
	"time"

	"realtimetransit/models"
)

type VehiclePositionResponse struct {
	VehicleID           string    `json:"vehicleId"`
	TripID              *string   `json:"tripId"`
	Lat                 *float64  `json:"lat"`
	Lon                 *float64  `json:"lon"`
	Bearing             *float64  `json:"bearing"`
	Speed               *float64  `json:"speed"`
	CurrentStatus       *string   `json:"currentStatus"`
	CurrentStopSequence *int      `json:"currentStopSequence"`
	StopID              *string   `json:"stopId"`
	CongestionLevel     *string   `json:"congestionLevel"`
	LastUpdated         time.Time `json:"lastUpdated"`
}

type LiveVehiclesResponse struct {
	RouteID  string                    `json:"routeId"`
	Vehicles []VehiclePositionResponse `json:"vehicles"`
	Total    int                       `json:"total"`
}

// ToVehiclePositionResponse converts a models.VehiclePosition
// to a VehiclePositionResponse DTO.
func ToVehiclePositionResponse(v models.VehiclePosition) VehiclePositionResponse {
	return VehiclePositionResponse{
		VehicleID:           v.VehicleID,
		TripID:              v.TripID,
		Lat:                 v.Lat,
		Lon:                 v.Lon,
		Bearing:             v.Bearing,
		Speed:               v.Speed,
		CurrentStatus:       v.CurrentStatus,
		CurrentStopSequence: v.CurrentStopSequence,
		StopID:              v.StopID,
		CongestionLevel:     v.CongestionLevel,
		LastUpdated:         toUTC(v.Ts),
	}
}

// ToLiveVehiclesResponse converts a slice of models.VehiclePosition
// to a LiveVehiclesResponse DTO.
func ToLiveVehiclesResponse(routeID string, positions []models.VehiclePosition) LiveVehiclesResponse {
	response := LiveVehiclesResponse{
		RouteID:  routeID,
		Vehicles: make([]VehiclePositionResponse, len(positions)),
		Total:    len(positions),
	}

	for i, p := range positions {
		response.Vehicles[i] = ToVehiclePositionResponse(p)
	}

	return response
}
