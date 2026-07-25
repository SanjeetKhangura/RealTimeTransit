package models

import (
	"time"
)

type BunchingPair struct {
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