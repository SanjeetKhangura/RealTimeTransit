package service

import (
	"testing"
)

func TestCalculateSeverity(t *testing.T) {
	tests := []struct {
		name	 string
		distance float64
		expected string
	}{
		{name: "Alert when distance is less than 100", distance: 50, expected: "alert"},
		{name: "Warning when distance is exactly 100", distance: 100, expected: "warning"},
		{name: "Warning when distance is between 100 and 300", distance: 150, expected: "warning"},
		{name: "Advisory when distance is exactly 300", distance: 300, expected: "advisory"},
		{name: "Advisory when distance is 300 or more", distance: 350, expected: "advisory"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateSeverity(tt.distance)
			if got != tt.expected {
				t.Errorf("calculateSeverity(%v) = %v; want %v", tt.distance, got, tt.expected)
			}
		})
	}
}
