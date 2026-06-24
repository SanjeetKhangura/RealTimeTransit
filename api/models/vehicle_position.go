package models

import "time"

type VehiclePosition struct {
	Ts                  time.Time `db:"ts"                   json:"ts"`
	VehicleID           string    `db:"vehicle_id"           json:"vehicleId"`
	TripID              string    `db:"trip_id"              json:"tripId"`
	RouteID             string    `db:"route_id"             json:"routeId"`
	Lat                 float64   `db:"lat"                  json:"lat"`
	Lon                 float64   `db:"lon"                  json:"lon"`
	Bearing             float64   `db:"bearing"              json:"bearing"`
	Speed               float64   `db:"speed"                json:"speed"`
	CurrentStatus       string    `db:"current_status"       json:"currentStatus"`
	CurrentStopSequence int       `db:"current_stop_sequence" json:"currentStopSequence"`
	StopID              string    `db:"stop_id"              json:"stopId"`
	CongestionLevel     string    `db:"congestion_level"     json:"congestionLevel"`
}
