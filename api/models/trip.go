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
