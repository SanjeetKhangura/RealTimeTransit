package handlers

import (
	"context"
	"net/http"

	"realtimetransit/dto"
	"realtimetransit/service"

	"github.com/danielgtaylor/huma/v2"
)

type AlertHandler struct {
	alertService *service.AlertService
}

func NewAlertHandler(alertService *service.AlertService) *AlertHandler {
	return &AlertHandler{alertService: alertService}
}

type GetActiveAlertsInput struct {
	RouteID string `path:"id" doc:"GTFS route ID"`
}

type GetActiveAlertsOutput struct {
	Body dto.AlertListResponse
}

// GetActiveAlerts handles GET /api/routes/{id}/alerts
// Returns all currently active service alerts.
// Note: currently returns all active alerts regardless of route
// as the service_alerts table has no route_id column.
// Will be updated to filter by route once schema change is agreed.
func (h *AlertHandler) GetActiveAlerts(ctx context.Context, input *GetActiveAlertsInput) (*GetActiveAlertsOutput, error) {
	alerts, err := h.alertService.GetActiveAlertsByRoute(ctx, input.RouteID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch alerts")
	}

	return &GetActiveAlertsOutput{
		Body: dto.ToAlertListResponse(input.RouteID, alerts),
	}, nil
}
