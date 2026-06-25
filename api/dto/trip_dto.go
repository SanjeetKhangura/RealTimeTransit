package dto

import "realtimetransit/models"

// DTO for the Trip model.
type TripResponse struct {
	DatasetID  				int    			`json:"datasetId"`
	TripID     				string 			`json:"tripId"`
	RouteID   				string 			`json:"routeId"`
	ServiceID  				string 			`json:"serviceId"`
	DirectionID 			*int   			`json:"directionId"`
	ShapeID    				*string 		`json:"shapeId"`
	TripHeadsign 			*string 		`json:"tripHeadsign"`
	WheelchairAccessible 	*int   			`json:"wheelchairAccessible"`
	BikesAllowed 			*int   			`json:"bikesAllowed"`
}

// converts a models.Trip to a TripResponse DTO.
func ToTripResponse(t models.Trip) TripResponse {
	return TripResponse{
		DatasetID:             t.DatasetID,
		TripID:                t.TripID,
		RouteID:               t.RouteID,
		ServiceID:             t.ServiceID,
		DirectionID:           t.DirectionID,
		ShapeID:               t.ShapeID,
		TripHeadsign:          t.TripHeadsign,
		WheelchairAccessible:  t.WheelchairAccessible,
		BikesAllowed:          t.BikesAllowed,
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