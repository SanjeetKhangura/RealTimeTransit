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
func (h *AlertHandler) GetActiveAlerts(ctx context.Context, input *GetActiveAlertsInput) (*GetActiveAlertsOutput, error) {
	alerts, err := h.alertService.GetActiveAlertsByRoute(ctx, input.RouteID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch alerts")
	}

	return &GetActiveAlertsOutput{
		Body: dto.ToAlertListResponse(input.RouteID, alerts),
	}, nil
}

// GetSystemAlertsInput has no parameters.
type GetSystemAlertsInput struct{}

// GetSystemAlertsOutput wraps the response body.
type GetSystemAlertsOutput struct {
	Body dto.SystemAlertsResponse
}

// GetSystemAlerts handles GET /api/alerts/system
// Returns all active alerts that apply to the entire agency.
// Returns empty array when no system wide alerts are active.
func (h *AlertHandler) GetSystemAlerts(ctx context.Context, input *GetSystemAlertsInput) (*GetSystemAlertsOutput, error) {
	alerts, err := h.alertService.GetSystemWideAlerts(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch system alerts")
	}

	return &GetSystemAlertsOutput{
		Body: dto.ToSystemAlertsResponse(alerts),
	}, nil
}

// GetAllAlertsInput has no parameters.
type GetAllAlertsInput struct{}

// GetAllAlertsOutput wraps the response body.
type GetAllAlertsOutput struct {
	Body dto.AllAlertsResponse
}

// GetAllAlerts handles GET /api/alerts
// Returns all currently active alerts across the entire network.
func (h *AlertHandler) GetAllAlerts(ctx context.Context, input *GetAllAlertsInput) (*GetAllAlertsOutput, error) {
	alerts, err := h.alertService.GetAllActiveAlerts(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch alerts")
	}

	return &GetAllAlertsOutput{
		Body: dto.ToAllAlertsResponse(alerts),
	}, nil
}
