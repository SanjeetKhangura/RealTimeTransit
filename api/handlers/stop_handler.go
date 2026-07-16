package handlers

import (
	"context"
	"net/http"

	"realtimetransit/dto"
	"realtimetransit/service"

	"github.com/danielgtaylor/huma/v2"
)

type StopHandler struct {
	stopService *service.StopService
}

func NewStopHandler(stopService *service.StopService) *StopHandler {
	return &StopHandler{stopService: stopService}
}

// GetStopsInput defines the path parameter and required trip_id query param.
// trip_id identifies exactly which bus's schedule to return, avoiding
// mixed real-time data from multiple trips on the same route.
type GetStopsInput struct {
	RouteID string `path:"id"           doc:"GTFS route ID"`
	TripID  string `query:"trip_id"     doc:"Trip ID to fetch stops for, required" required:"true"`
}

// GetStopsOutput wraps the response body.
type GetStopsOutput struct {
	Body dto.TripStopListResponse
}

// GetStops handles GET /api/routes/{id}/stops?trip_id=...
// Returns all stops for the specified trip with scheduled arrival times
// and real-time delay if available within the last 300 seconds.
// trip_id is required to avoid returning mixed real-time data from
// multiple buses serving the same route.
// Frontend polls this every 30s for the route detail page.
func (h *StopHandler) GetStops(ctx context.Context, input *GetStopsInput) (*GetStopsOutput, error) {
	stops, err := h.stopService.GetStopsWithTimesByTrip(ctx, input.TripID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch stops")
	}

	return &GetStopsOutput{
		Body: dto.ToTripStopListResponse(input.RouteID, input.TripID, stops),
	}, nil
}
