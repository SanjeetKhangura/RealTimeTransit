package dto

import (
	"time"
	"realtimetransit/models"
)

type BunchingPairResponse struct {
	RouteID          		string    	`json:"route_id"`
	DirectionID      		*int       	`json:"direction_id"`
	ShapeID          		string    	`json:"shape_id"`
	LeadingVehicleID 		string    	`json:"leading_vehicle_id"`
	FollowingVehicleID 		string  	`json:"following_vehicle_id"`
	LeadingTripID    		string    	`json:"leading_trip_id"`
	FollowingTripID  		string    	`json:"following_trip_id"`
	DistanceAlongRoute 		float64 	`json:"distance_along_route"`
	LeadingProgress  		float64   	`json:"leading_progress"`
	FollowingProgress 		float64  	`json:"following_progress"`
	Severity        		string    	`json:"severity"`
	DetectedAt       		time.Time 	`json:"detected_at"`
}

type BunchingResponse struct {
	RouteID string 						`json:"route_id"`
	Pairs   []BunchingPairResponse 		`json:"pairs"`
	Count   int 						`json:"count"`
}

func ToBunchingResponse(routeID string, pairs []models.BunchingPair) BunchingResponse {
	response := BunchingResponse{
		RouteID: routeID,
		Pairs:   make([]BunchingPairResponse, len(pairs)),
		Count:   len(pairs),
	}

	for i, pair := range pairs {
		response.Pairs[i] = BunchingPairResponse{
			RouteID:          		pair.RouteID,
			DirectionID:      		pair.DirectionID,
			ShapeID:          		pair.ShapeID,
			LeadingVehicleID: 		pair.LeadingVehicleID,
			FollowingVehicleID: 	pair.FollowingVehicleID,
			LeadingTripID:    		pair.LeadingTripID,
			FollowingTripID:  		pair.FollowingTripID,
			DistanceAlongRoute: 	pair.DistanceAlongRoute,
			LeadingProgress:  		pair.LeadingProgress,
			FollowingProgress: 		pair.FollowingProgress,
			Severity:        		pair.Severity,
			DetectedAt:				toUTC(pair.DetectedAt),
		}
	}

	return response
}