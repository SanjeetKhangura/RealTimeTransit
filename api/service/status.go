package service

import "realtimetransit/models"

// Status constants used across route list and route detail responses.
const (
	StatusOnTime      = "on_time"
	StatusMinorDelays = "minor_delays"
	StatusDisrupted   = "disrupted"
	StatusUnknown     = "unknown"
)

// Delay thresholds in seconds.
// These match the configurable thresholds from the requirements doc.
// When the admin threshold configuration is built these will be
// read from config instead of being hardcoded here.
const (
	minorDelayThresholdSecs = 120.0 // 2 minutes
	disruptedThresholdSecs  = 300.0 // 5 minutes
)

// computeStatus derives a route status string from average delay seconds.
// Called for both the route list and route detail endpoints.
func computeStatus(metric *models.RouteDelayMetric) string {
	if metric == nil {
		return StatusUnknown
	}
	if metric.AvgDelay >= disruptedThresholdSecs {
		return StatusDisrupted
	}
	if metric.AvgDelay >= minorDelayThresholdSecs {
		return StatusMinorDelays
	}
	return StatusOnTime
}

// computeHealthScore derives a 0.0 to 5.0 health score from average delay.
// Returns 0.0 when no data is available.
// This is a temporary implementation based on trip_updates data.
func computeHealthScore(metric *models.RouteDelayMetric) float64 {
	if metric == nil {
		return 0.0
	}

	avgDelay := metric.AvgDelay

	switch {
	case avgDelay < 0:
		// Running early — still healthy
		return 5.0
	case avgDelay < 60:
		return 5.0
	case avgDelay < 120:
		return 4.0
	case avgDelay < 180:
		return 3.5
	case avgDelay < 300:
		return 2.5
	case avgDelay < 600:
		return 1.5
	default:
		return 1.0
	}
}
