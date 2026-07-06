package service

import (
	"context"
	"fmt"
	"time"

	"realtimetransit/models"
	"realtimetransit/repository"
)

// HistoryService handles business logic for historical reliability data.
type HistoryService struct {
	tripRepo *repository.TripRepository
}

// NewHistoryService creates a new HistoryService.
// Called in main.go when wiring dependencies.
func NewHistoryService(tripRepo *repository.TripRepository) *HistoryService {
	return &HistoryService{tripRepo: tripRepo}
}

// validBuckets defines the allowed bucket intervals.
// Prevents SQL injection through the bucket parameter.
var validBuckets = map[string]string{
	"hour":  "1 hour",
	"30min": "30 minutes",
	"day":   "1 day",
}

// GetRouteHistory returns time-bucketed reliability data for a route.
// bucket must be one of: hour, 30min, day - defaults to hour if invalid.
// from and to are the time range to query.
func (s *HistoryService) GetRouteHistory(
	ctx context.Context,
	routeID string,
	from time.Time,
	to time.Time,
	bucket string,
) ([]models.HistoryPoint, error) {
	// Validate bucket — prevents SQL injection since we use fmt.Sprintf
	bucketInterval, ok := validBuckets[bucket]
	if !ok {
		bucketInterval = "1 hour"
	}

	points, err := s.tripRepo.GetRouteHistory(ctx, routeID, from, to, bucketInterval)
	if err != nil {
		return nil, fmt.Errorf("getting history for route %s: %w", routeID, err)
	}

	return points, nil
}
