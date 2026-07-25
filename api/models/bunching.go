package models

import (
	"time"
)

type BunchingPair struct {
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