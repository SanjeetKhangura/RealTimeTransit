package models

import "time"

type TripUpdate struct {
	TS                   time.Time  `db:"ts"                    json:"ts"`
	TripID               string     `db:"trip_id"               json:"tripId"`
	RouteID              string     `db:"route_id"              json:"routeId"`
	StopID               string     `db:"stop_id"               json:"stopId"`
	StopSequence         *int       `db:"stop_sequence"         json:"stopSequence"`
	ArrivalDelay         *int       `db:"arrival_delay"         json:"arrivalDelay"`
	ArrivalTime          *time.Time `db:"arrival_time"          json:"arrivalTime"`
	DepartureDelay       *int       `db:"departure_delay"       json:"departureDelay"`
	DepartureTime        *time.Time `db:"departure_time"        json:"departureTime"`
	ScheduleRelationship *string    `db:"schedule_relationship" json:"scheduleRelationship"`
}
