package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"realtimetransit/dto"
	"realtimetransit/service"

	"github.com/danielgtaylor/huma/v2"
)

// HistoryHandler handles HTTP requests for historical reliability endpoints.
// Receives a HistoryService via dependency injection.
type HistoryHandler struct {
	historyService *service.HistoryService
}

// NewHistoryHandler creates a new HistoryHandler.
// Called in main.go when wiring dependencies.
func NewHistoryHandler(historyService *service.HistoryService) *HistoryHandler {
	return &HistoryHandler{historyService: historyService}
}

// GetRouteHistoryInput defines the path and query parameters.
// from and to are ISO 8601 UTC timestamps.
// bucket is one of: hour, 30min, day - defaults to hour.
type GetRouteHistoryInput struct {
	RouteID string `path:"id"    doc:"GTFS route ID"`
	From    string `query:"from" doc:"Start of time range, ISO 8601 UTC e.g. 2026-06-01T00:00:00Z"`
	To      string `query:"to"   doc:"End of time range, ISO 8601 UTC e.g. 2026-06-17T00:00:00Z"`
	Bucket  string `query:"bucket" doc:"Time bucket size: hour, 30min, day (default: hour)"`
}

// GetRouteHistoryOutput wraps the response body.
type GetRouteHistoryOutput struct {
	Body dto.RouteHistoryResponse
}

// GetRouteHistory handles GET /api/routes/{id}/history
// Returns time-bucketed average arrival delay for the route
// between the given from and to timestamps.
// Called once per page load for the reliability chart.
func (h *HistoryHandler) GetRouteHistory(ctx context.Context, input *GetRouteHistoryInput) (*GetRouteHistoryOutput, error) {
	// Parse from timestamp — default to 7 days ago if not provided
	var from time.Time
	var err error
	if input.From == "" {
		from = time.Now().UTC().AddDate(0, 0, -7)
	} else {
		from, err = time.Parse(time.RFC3339, input.From)
		if err != nil {
			return nil, huma.NewError(http.StatusBadRequest, "invalid from timestamp, use ISO 8601 UTC e.g. 2026-06-01T00:00:00Z")
		}
	}

	// Parse to timestamp — default to now if not provided
	var to time.Time
	if input.To == "" {
		to = time.Now().UTC()
	} else {
		to, err = time.Parse(time.RFC3339, input.To)
		if err != nil {
			return nil, huma.NewError(http.StatusBadRequest, "invalid to timestamp, use ISO 8601 UTC e.g. 2026-06-17T00:00:00Z")
		}
	}

	// Default bucket to hour if not provided
	bucket := input.Bucket
	if bucket == "" {
		bucket = "hour"
	}

	points, err := h.historyService.GetRouteHistory(ctx, input.RouteID, from, to, bucket)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, huma.NewError(http.StatusNotFound, err.Error())
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch route history")
	}

	return &GetRouteHistoryOutput{
		Body: dto.ToRouteHistoryResponse(input.RouteID, from, to, bucket, points),
	}, nil
}
