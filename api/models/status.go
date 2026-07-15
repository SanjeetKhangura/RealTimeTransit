package models

import "time"

type RouteStatus struct {
	RouteID     	string     	`json:"routeId"`
	Status	  		string     	`json:"status"`
	VehicleCount 	int        	`json:"vehicleCount"`
	AlertCount   	int        	`json:"alertCount"`
	AvgDelay		int    		`json:"avgDelay"`
	HealthScore		float64    	`json:"healthScore"`
	SampleSize		int    		`json:"sampleSize"`
	LastUpdated 	time.Time  	`json:"lastUpdated"`
}