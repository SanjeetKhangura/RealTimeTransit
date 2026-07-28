package dto

import "realtimetransit/models"

// DTO for the Trip model.
type TripResponse struct {
	DatasetID            int     `json:"datasetId"`
	TripID               string  `json:"tripId"`
	RouteID              string  `json:"routeId"`
	ServiceID            string  `json:"serviceId"`
	DirectionID          *int    `json:"directionId"`
	ShapeID              *string `json:"shapeId"`
	TripHeadsign         *string `json:"tripHeadsign"`
	WheelchairAccessible *int    `json:"wheelchairAccessible"`
	BikesAllowed         *int    `json:"bikesAllowed"`
}

// converts a models.Trip to a TripResponse DTO.
func ToTripResponse(t models.Trip) TripResponse {
	return TripResponse{
		DatasetID:            t.DatasetID,
		TripID:               t.TripID,
		RouteID:              t.RouteID,
		ServiceID:            t.ServiceID,
		DirectionID:          t.DirectionID,
		ShapeID:              t.ShapeID,
		TripHeadsign:         t.TripHeadsign,
		WheelchairAccessible: t.WheelchairAccessible,
		BikesAllowed:         t.BikesAllowed,
	}
}

//  Response with all trips for a specific route.
type RouteTripsResponse struct {
	RouteID string         `json:"routeId"`
	Total   int            `json:"total"`
	Trips   []TripResponse `json:"trips"`
}

func ToRouteTripsResponse(routeID string, trips []models.Trip) RouteTripsResponse {
	response := RouteTripsResponse{
		RouteID: routeID,
		Total:   len(trips),
		Trips:   make([]TripResponse, len(trips)),
	}

	for i, t := range trips {
		response.Trips[i] = ToTripResponse(t)
	}

	return response
}

// TripScheduleSummaryResponse is the JSON shape for one trip's schedule summary.
// Used by GET /api/routes/{id}/trips/schedule to help the frontend
// pick an active or next-departing trip.
type TripScheduleSummaryResponse struct {
	TripID       string  `json:"tripId"`
	DirectionID  *int    `json:"directionId"`
	TripHeadsign *string `json:"tripHeadsign"`
	StartSeconds *int    `json:"startSeconds"`
	EndSeconds   *int    `json:"endSeconds"`
	IsActive     bool    `json:"isActive"`
}

// TripScheduleListResponse is the JSON shape returned by
// GET /api/routes/{id}/trips/schedule
type TripScheduleListResponse struct {
	RouteID string                        `json:"routeId"`
	Trips   []TripScheduleSummaryResponse `json:"trips"`
	Total   int                           `json:"total"`
}

// ToTripScheduleSummaryResponse converts a models.TripScheduleSummary
// to a TripScheduleSummaryResponse DTO.
func ToTripScheduleSummaryResponse(t models.TripScheduleSummary) TripScheduleSummaryResponse {
	return TripScheduleSummaryResponse{
		TripID:       t.TripID,
		DirectionID:  t.DirectionID,
		TripHeadsign: t.TripHeadsign,
		StartSeconds: t.StartSeconds,
		EndSeconds:   t.EndSeconds,
		IsActive:     t.IsActive,
	}
}

// ToTripScheduleListResponse converts a slice of models.TripScheduleSummary
// to a TripScheduleListResponse DTO.
func ToTripScheduleListResponse(routeID string, summaries []models.TripScheduleSummary) TripScheduleListResponse {
	response := TripScheduleListResponse{
		RouteID: routeID,
		Trips:   make([]TripScheduleSummaryResponse, len(summaries)),
		Total:   len(summaries),
	}
	for i, s := range summaries {
		response.Trips[i] = ToTripScheduleSummaryResponse(s)
	}
	return response
}
