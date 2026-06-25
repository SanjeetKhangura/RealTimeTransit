package handlers

import (
	"context"
	"net/http"
	"strings"

	"realtimetransit/dto"
	"realtimetransit/service"

	"github.com/danielgtaylor/huma/v2"
)

type TripHandler struct {
	tripService *service.TripService
}

func NewTripHandler(tripService *service.TripService) *TripHandler {
	return &TripHandler{tripService: tripService}
}

type GetTripUpdatesInput struct {
	RouteID string `path:"id" doc:"GTFS route ID"`
}

type GetTripUpdatesOutput struct {
	Body dto.RouteTripUpdatesResponse
}

// GetTripUpdates handles GET /api/routes/{id}/trip-updates
// Returns the most recent trip update for each trip on the route.
func (h *TripHandler) GetTripUpdates(ctx context.Context, input *GetTripUpdatesInput) (*GetTripUpdatesOutput, error) {
	updates, err := h.tripService.GetTripUpdatesByRoute(ctx, input.RouteID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, huma.NewError(http.StatusNotFound, err.Error())
		}
		return nil, huma.NewError(http.StatusInternalServerError, "Failed to fetch trip updates: %v", err)
	}

	return &GetTripUpdatesOutput{
		Body: dto.ToRouteTripUpdatesResponse(input.RouteID, updates),
	}, nil
}