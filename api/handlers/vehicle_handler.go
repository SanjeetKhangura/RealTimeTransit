package handlers

import (
	"context"
	"net/http"
	"strings"

	"realtimetransit/dto"
	"realtimetransit/service"

	"github.com/danielgtaylor/huma/v2"
)

type VehicleHandler struct {
	vehicleService *service.VehicleService
}

func NewVehicleHandler(vehicleService *service.VehicleService) *VehicleHandler {
	return &VehicleHandler{vehicleService: vehicleService}
}

type GetLiveVehiclesInput struct {
	RouteID string `path:"id" doc:"GTFS route ID"`
}

type GetLiveVehiclesOutput struct {
	Body dto.LiveVehiclesResponse
}

// GetLiveVehicles handles GET /api/routes/{id}/live
// Returns the latest position for each active vehicle on the route.
func (h *VehicleHandler) GetLiveVehicles(ctx context.Context, input *GetLiveVehiclesInput) (*GetLiveVehiclesOutput, error) {
	positions, err := h.vehicleService.GetLiveVehiclesByRoute(ctx, input.RouteID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, huma.NewError(http.StatusNotFound, err.Error())
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch live vehicles")
	}

	return &GetLiveVehiclesOutput{
		Body: dto.ToLiveVehiclesResponse(input.RouteID, positions),
	}, nil
}
