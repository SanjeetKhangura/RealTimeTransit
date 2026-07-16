package models

type Trip struct {
	DatasetID            int     `db:"dataset_id"            json:"datasetId"`
	TripID               string  `db:"trip_id"               json:"tripId"`
	RouteID              string  `db:"route_id"              json:"routeId"`
	ServiceID            string  `db:"service_id"            json:"serviceId"`
	DirectionID          *int    `db:"direction_id"          json:"directionId"`
	ShapeID              *string `db:"shape_id"              json:"shapeId"`
	TripHeadsign         *string `db:"trip_headsign"         json:"tripHeadsign"`
	WheelchairAccessible *int    `db:"wheelchair_accessible" json:"wheelchairAccessible"`
	BikesAllowed         *int    `db:"bikes_allowed"         json:"bikesAllowed"`
}

// RouteDelayMetric holds computed delay statistics for a single route.
// Not a database table — computed on the fly from trip_updates.
// Used to derive route status and health score.
type RouteDelayMetric struct {
	RouteID    string  `db:"route_id"`
	AvgDelay   float64 `db:"avg_delay"`
	SampleSize int     `db:"sample_size"`
}

// TripScheduleSummary holds enough info for the frontend to choose
// a representative trip: when it starts, when it ends, and whether
// it currently has live real-time data within the last 300 seconds.
// computed from trips joined with stop_times
// and trip_updates.
type TripScheduleSummary struct {
	TripID       string  `db:"trip_id"       json:"tripId"`
	DirectionID  *int    `db:"direction_id"  json:"directionId"`
	TripHeadsign *string `db:"trip_headsign" json:"tripHeadsign"`
	StartSeconds *int    `db:"start_seconds" json:"startSeconds"`
	EndSeconds   *int    `db:"end_seconds"   json:"endSeconds"`
	IsActive     bool    `db:"is_active"     json:"isActive"`
}
