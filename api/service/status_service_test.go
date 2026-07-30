package service

import (
	"testing"
	"realtimetransit/models"
)

func TestComputeStatus(t *testing.T) {
	tests := []struct {
		name     string
		metric   *models.RouteDelayMetric
		expected string
	}{
		{name: "Unknown when metric is nil", metric: nil, expected: StatusUnknown},
		{name: "Disrupted when avg delay is exactly disrupted threshold", metric: &models.RouteDelayMetric{AvgDelay: 480}, expected: StatusDisrupted},
		{name: "Disrupted when avg delay is greater than or equal to disrupted threshold", metric: &models.RouteDelayMetric{AvgDelay: 500}, expected: StatusDisrupted},
		{name: "Minor delays when avg delay is between minor and disrupted thresholds", metric: &models.RouteDelayMetric{AvgDelay: 300}, expected: StatusMinorDelays},
		{name: "Minor delays when avg delay is exactly minor threshold", metric: &models.RouteDelayMetric{AvgDelay: 180}, expected: StatusMinorDelays},
		{name: "On time when avg delay is less than minor threshold", metric: &models.RouteDelayMetric{AvgDelay: 179.9}, expected: StatusOnTime},
		{name: "On time when avg delay is zero", metric: &models.RouteDelayMetric{AvgDelay: 0}, expected: StatusOnTime},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeStatus(tt.metric)
			if got != tt.expected {
				t.Errorf("computeStatus(%v) = %v; want %v", tt.metric, got, tt.expected)
			}
		})
	}
}

func TestComputeHealthScore(t *testing.T) {
	tests := []struct {
		name     string
		metric   *models.RouteDelayMetric
		expected float64
	}{
		{name: "Health score is 0 when metric is nil", metric: nil, expected: 0},
		{name: "Health score is 5 when vehicle is early (negative avg delay)", metric: &models.RouteDelayMetric{AvgDelay: -0.1}, expected: 5},
		{name: "Health score is 5 when avg delay is zero", metric: &models.RouteDelayMetric{AvgDelay: 0}, expected: 5},
		{name: "Health score is 5 when avg delay is less than 1 minute", metric: &models.RouteDelayMetric{AvgDelay: 59}, expected: 5},
		{name: "Health score is 4 when avg delay is exactly 1 minute", metric: &models.RouteDelayMetric{AvgDelay: 60}, expected: 4},
		{name: "Health score is 3.5 when avg delay is exactly 2 minutes", metric: &models.RouteDelayMetric{AvgDelay: 120}, expected: 3.5},
		{name: "Health score is 2.5 when avg delay is exactly 3 minutes", metric: &models.RouteDelayMetric{AvgDelay: 180}, expected: 2.5},
		{name: "Health score is 1.5 when avg delay is exactly 5 minutes", metric: &models.RouteDelayMetric{AvgDelay: 300}, expected: 1.5},
		{name: "Health score is 1 when avg delay is 1 second after 10 minutes", metric: &models.RouteDelayMetric{AvgDelay: 601}, expected: 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeHealthScore(tt.metric)
			if got != tt.expected {
				t.Errorf("computeHealthScore(%v) = %v; want %v", tt.metric, got, tt.expected)
			}
		})
	}
}