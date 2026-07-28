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

type AllRouteStatusResponse struct {
	Count 		int						`json:"count"`
	Statuses 	[]RouteStatusResponse	`json:"statuses"`
}

func ToAllRouteStatusResponse(statuses []models.RouteStatus) AllRouteStatusResponse {
	result := make([]RouteStatusResponse, len(statuses))
	for i, status := range statuses {
		result[i] = ToRouteStatusResponse(status)
	}
	return AllRouteStatusResponse{
		Count: len(result),
		Statuses: result,
	}
}