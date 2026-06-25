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

type GetTripsInput struct {
	RouteID string `path:"id" doc:"GTFS route ID"`
}

type GetTripsOutput struct {
	Body dto.RouteTripsResponse
}

// GET /api/routes/{id}/trips
// Returns all trips for the route.
func (h *TripHandler) GetTrips(ctx context.Context, input *GetTripsInput) (*GetTripsOutput, error) {
	trips, err := h.tripService.GetTripsByRoute(ctx, input.RouteID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, huma.NewError(http.StatusNotFound, err.Error())
		}
		return nil, huma.NewError(http.StatusInternalServerError, "Failed to fetch trips: %v", err)
	}

	return &GetTripsOutput{
		Body: dto.ToRouteTripsResponse(input.RouteID, trips),
	}, nil
}