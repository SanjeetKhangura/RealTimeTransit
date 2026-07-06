package handlers

import (
	"context"
	"net/http"
	"strings"

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

type GetStopsInput struct {
	RouteID string `path:"id" doc:"GTFS route ID"`
}

type GetStopsOutput struct {
	Body dto.StopListResponse
}

// GetStops handles GET /api/routes/{id}/stops
// Returns all stops for a route with scheduled arrival times
// and real-time delay if available.
func (h *StopHandler) GetStops(ctx context.Context, input *GetStopsInput) (*GetStopsOutput, error) {
	stops, err := h.stopService.GetStopsWithTimesByRoute(ctx, input.RouteID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, huma.NewError(http.StatusNotFound, err.Error())
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch stops")
	}

	return &GetStopsOutput{
		Body: dto.ToStopListResponse(input.RouteID, stops),
	}, nil
}
