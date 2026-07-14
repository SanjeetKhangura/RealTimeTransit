package models

import "time"

type ServiceAlert struct {
	Ts              time.Time  `db:"ts"               json:"ts"`
	AlertID         string     `db:"alert_id"         json:"alertId"`
	Cause           *string    `db:"cause"            json:"cause"`
	Effect          *string    `db:"effect"           json:"effect"`
	HeaderText      *string    `db:"header_text"      json:"headerText"`
	DescriptionText *string    `db:"description_text" json:"descriptionText"`
	StartTime       *time.Time `db:"start_time"       json:"startTime"`
	EndTime         *time.Time `db:"end_time"         json:"endTime"`
}

// ServiceAlertEntity represents one informed entity for a service alert.
// One alert can have multiple entities linking it to routes, trips, and stops.
type ServiceAlertEntity struct {
	Ts          time.Time `db:"ts"`
	AlertID     string    `db:"alert_id"`
	AgencyID    *string   `db:"agency_id"`
	RouteID     *string   `db:"route_id"`
	TripID      *string   `db:"trip_id"`
	StopID      *string   `db:"stop_id"`
	DirectionID *int      `db:"direction_id"`
}
