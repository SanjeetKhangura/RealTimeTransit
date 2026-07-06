package dto

import(
	"time"
	"realtimetransit/models"
)

type TripUpdateResponse struct {
	TS     					time.Time 		`json:"ts"`
	TripID        			string    		`json:"tripId"`
	RouteID       			string    		`json:"routeId"`
	StopID		 			string    		`json:"stopId"`
	StopSequence    		*int       		`json:"stopSequence"`
	ArrivalDelay   			*int       		`json:"arrivalDelay"`
	ArrivalTime    			*time.Time 		`json:"arrivalTime"`
	DeoartureDelay  		*int       		`json:"departureDelay"`
	DepartureTime  			*time.Time 		`json:"departureTime"`
	ScheduleRelationship 	*string    		`json:"scheduleRelationship"`
}

type RouteTripUpdatesResponse struct {
	RouteID     string               `json:"routeId"`
	Total       int                  `json:"total"`
	TripUpdates []TripUpdateResponse `json:"tripUpdates"`
}

func ToTripUpdateResponse(t models.TripUpdate) TripUpdateResponse {
	return TripUpdateResponse{
		TS: t.TS,
		TripID: t.TripID,
		RouteID: t.RouteID,
		StopID: t.StopID,
		StopSequence: t.StopSequence,
		ArrivalDelay: t.ArrivalDelay,
		ArrivalTime: t.ArrivalTime,
		DeoartureDelay: t.DeoartureDelay,
		DepartureTime: t.DepartureTime,
		ScheduleRelationship: t.ScheduleRelationship,
	}
}

func ToRouteTripUpdatesResponse(routeID string, tripUpdates []models.TripUpdate) RouteTripUpdatesResponse {
	response := RouteTripUpdatesResponse{
		RouteID: routeID,
		Total: len(tripUpdates),
		TripUpdates: make([]TripUpdateResponse, len(tripUpdates)),
	}

	for i, tu := range tripUpdates {
		response.TripUpdates[i] = ToTripUpdateResponse(tu)
	}

	return response
}