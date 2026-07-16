package dto

import (
	"time"

	"realtimetransit/models"
)

// StopResponse is the JSON shape returned for a single stop.
// ArrivalSeconds is seconds since midnight per GTFS spec.
// The frontend converts this to a readable time.
// ArrivalDelay is seconds of delay from real-time data, null if unavailable.
// ArrivalTime is the real-time predicted arrival timestamp, null if unavailable.
type StopResponse struct {
	StopID             string     `json:"stopId"`
	StopName           *string    `json:"stopName"`
	StopLat            *float64   `json:"stopLat"`
	StopLon            *float64   `json:"stopLon"`
	StopCode           *string    `json:"stopCode"`
	StopDesc           *string    `json:"stopDesc"`
	WheelchairBoarding *int16     `json:"wheelchairBoarding"`
	StopSequence       int        `json:"stopSequence"`
	ArrivalSeconds     *int       `json:"arrivalSeconds"`
	DepartureSeconds   *int       `json:"departureSeconds"`
	ArrivalDelay       *int       `json:"arrivalDelay"`
	ArrivalTime        *time.Time `json:"arrivalTime"`
}

// StopListResponse is the JSON shape returned by
// GET /api/routes/{id}/stops
// Wraps the stop list with the route ID and total count.
type StopListResponse struct {
	RouteID string         `json:"routeId"`
	Stops   []StopResponse `json:"stops"`
	Total   int            `json:"total"`
}

// ToStopResponse converts a models.StopWithTimes to a StopResponse DTO.
func ToStopResponse(s models.StopWithTimes) StopResponse {
	return StopResponse{
		StopID:             s.StopID,
		StopName:           s.StopName,
		StopLat:            s.StopLat,
		StopLon:            s.StopLon,
		StopCode:           s.StopCode,
		StopDesc:           s.StopDesc,
		WheelchairBoarding: s.WheelchairBoarding,
		StopSequence:       s.StopSequence,
		ArrivalSeconds:     s.ArrivalSeconds,
		DepartureSeconds:   s.DepartureSeconds,
		ArrivalDelay:       s.ArrivalDelay,
		ArrivalTime:        toUTCPtr(s.ArrivalTime),
	}
}

// ToStopListResponse converts a slice of models.StopWithTimes
// to a StopListResponse DTO.
func ToStopListResponse(routeID string, stops []models.StopWithTimes) StopListResponse {
	response := StopListResponse{
		RouteID: routeID,
		Stops:   make([]StopResponse, len(stops)),
		Total:   len(stops),
	}

	for i, s := range stops {
		response.Stops[i] = ToStopResponse(s)
	}

	return response
}

// TripStopListResponse is the JSON shape returned by
// GET /api/routes/{id}/stops?trip_id=...
// Includes both the route and trip context so the frontend
// knows exactly which bus this schedule belongs to.
type TripStopListResponse struct {
	RouteID string         `json:"routeId"`
	TripID  string         `json:"tripId"`
	Stops   []StopResponse `json:"stops"`
	Total   int            `json:"total"`
}

// ToTripStopListResponse converts a slice of models.StopWithTimes
// to a TripStopListResponse DTO, tagged with the route and trip it belongs to.
func ToTripStopListResponse(routeID string, tripID string, stops []models.StopWithTimes) TripStopListResponse {
	response := TripStopListResponse{
		RouteID: routeID,
		TripID:  tripID,
		Stops:   make([]StopResponse, len(stops)),
		Total:   len(stops),
	}
	for i, s := range stops {
		response.Stops[i] = ToStopResponse(s)
	}
	return response
}
