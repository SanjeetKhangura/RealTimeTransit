package handlers

import (
	"context"
	"log"
	"net/http"

	"realtimetransit/dto"
	"realtimetransit/service"

	"github.com/danielgtaylor/huma/v2"
)

type StatusHandler struct {
	statusService *service.StatusService
}

func NewStatusHandler(statusService *service.StatusService) *StatusHandler {
	return &StatusHandler{
		statusService: statusService,
	}
}

type GetRouteStatusInput struct {
	RouteID string `path:"id" doc:"GTFS route ID"`
}

type GetRouteStatusOutput struct {
	Body dto.RouteStatusResponse
}

func (h *StatusHandler) GetRouteStatus(ctx context.Context, input *GetRouteStatusInput) (*GetRouteStatusOutput, error) {
	status, err := h.statusService.GetRouteStatus(ctx, input.RouteID)
	if err != nil {
		log.Printf("Error getting route status for route %s: %v", input.RouteID, err)
		return nil, huma.NewError(http.StatusInternalServerError, "Failed to get route status")
	}

	return &GetRouteStatusOutput{
		Body: dto.ToRouteStatusResponse(status),
	}, nil
}

type GetAllRouteStatusesInput struct{}

type GetAllRouteStatusesOutput struct {
	Body dto.AllRouteStatusResponse
}

func (h *StatusHandler) GetAllRouteStatuses(ctx context.Context, input *GetAllRouteStatusesInput) (*GetAllRouteStatusesOutput, error) {
	statuses, err := h.statusService.GetAllRouteStatuses(ctx)
	if err != nil {
		log.Printf("Error getting all route statuses: %v", err)
		return nil, huma.NewError(http.StatusInternalServerError, "Failed to get all route statuses")
	}

	return &GetAllRouteStatusesOutput{
		Body: dto.ToAllRouteStatusResponse(statuses),
	}, nil
}