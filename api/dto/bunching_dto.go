package dto

import (
	"time"
	"realtimetransit/models"
)

type BunchingPairResponse struct {
	RouteID          		string    	`json:"routeId"`
	DirectionID      		*int       	`json:"directionId"`
	ShapeID          		string    	`json:"shapeId"`
	LeadingVehicleID 		string    	`json:"leadingVehicleId"`
	FollowingVehicleID 		string  	`json:"followingVehicleId"`
	LeadingTripID    		string    	`json:"leadingTripId"`
	FollowingTripID  		string    	`json:"followingTripId"`
	DistanceAlongRoute 		float64 	`json:"distanceAlongRoute"`
	LeadingProgress  		float64   	`json:"leadingProgress"`
	FollowingProgress 		float64  	`json:"followingProgress"`
	Severity        		string    	`json:"severity"`
	DetectedAt       		time.Time 	`json:"detectedAt"`
}

type BunchingResponse struct {
	RouteID string 						`json:"routeId"`
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