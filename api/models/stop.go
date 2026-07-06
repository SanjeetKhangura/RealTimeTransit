package models

import "time"

// Stop represents a physical bus stop from the GTFS static schedule.
type Stop struct {
	DatasetID          int      `db:"dataset_id"          json:"datasetId"`
	StopID             string   `db:"stop_id"             json:"stopId"`
	StopName           *string  `db:"stop_name"           json:"stopName"`
	StopLat            *float64 `db:"stop_lat"            json:"stopLat"`
	StopLon            *float64 `db:"stop_lon"            json:"stopLon"`
	StopCode           *string  `db:"stop_code"           json:"stopCode"`
	StopDesc           *string  `db:"stop_desc"           json:"stopDesc"`
	WheelchairBoarding *int16   `db:"wheelchair_boarding" json:"wheelchairBoarding"`
}

// StopWithTimes combines a Stop with its scheduled and real-time arrival data.
// Not a database table - assembled by the service layer from
// stop_times and trip_updates.
type StopWithTimes struct {
	Stop
	StopSequence     int        `db:"stop_sequence"     json:"stopSequence"`
	ArrivalSeconds   *int       `db:"arrival_seconds"   json:"arrivalSeconds"`
	DepartureSeconds *int       `db:"departure_seconds" json:"departureSeconds"`
	ArrivalDelay     *int       `db:"arrival_delay"     json:"arrivalDelay"`
	ArrivalTime      *time.Time `db:"arrival_time"      json:"arrivalTime"`
}
