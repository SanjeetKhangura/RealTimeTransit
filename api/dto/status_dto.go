package dto

import (
	"time"
	"realtimetransit/models"
)

type RouteStatusResponse struct {
	RouteID     	string     	`json:"routeId"`
	Status	  		string     	`json:"status"`
	VehicleCount 	int        	`json:"vehicleCount"`
	AlertCount   	int        	`json:"alertCount"`
	AvgDelay		int    		`json:"avgDelay"`
	HealthScore		float64    	`json:"healthScore"`
	SampleSize		int    		`json:"sampleSize"`
	LastUpdated 	time.Time  	`json:"lastUpdated"`
}

func ToRouteStatusResponse(status models.RouteStatus) RouteStatusResponse {
	return RouteStatusResponse{
		RouteID:     	status.RouteID,
		Status:	  		status.Status,
		VehicleCount: 	status.VehicleCount,
		AlertCount:   	status.AlertCount,
		AvgDelay:		status.AvgDelay,
		HealthScore:	status.HealthScore,
		SampleSize:		status.SampleSize,
		LastUpdated: 	status.LastUpdated,
	}
}