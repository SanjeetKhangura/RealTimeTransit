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
