package models

import "time"

// HistoryPoint represents one time-bucketed reliability data point.
// Used to power the historical reliability chart on the route detail page.
type HistoryPoint struct {
	Bucket       time.Time `db:"bucket"`
	AvgDelaySecs float64   `db:"avg_delay_secs"`
	SampleSize   int       `db:"sample_size"`
}
