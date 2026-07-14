package dto

import (
	"time"

	"realtimetransit/models"
)

// ServiceAlertResponse is the JSON shape returned for a single
// service alert.
type ServiceAlertResponse struct {
	AlertID         string     `json:"alertId"`
	Cause           *string    `json:"cause"`
	Effect          *string    `json:"effect"`
	HeaderText      *string    `json:"headerText"`
	DescriptionText *string    `json:"descriptionText"`
	StartTime       *time.Time `json:"startTime"`
	EndTime         *time.Time `json:"endTime"`
}

// AlertListResponse is the JSON shape returned by
// GET /api/routes/{id}/alerts
// Wraps the alert list with the route ID and total count.
// Note: alerts are not yet filtered by route as the service_alerts
// table has no route_id column. All active alerts are returned
// until the schema is updated.
type AlertListResponse struct {
	RouteID string                 `json:"routeId"`
	Alerts  []ServiceAlertResponse `json:"alerts"`
	Total   int                    `json:"total"`
}

// SystemAlertsResponse is the JSON shape returned by GET /api/alerts/system
// Contains only alerts that apply to the entire agency.
type SystemAlertsResponse struct {
	Alerts []ServiceAlertResponse `json:"alerts"`
	Total  int                    `json:"total"`
}

// AllAlertsResponse is the JSON shape returned by GET /api/alerts
// Contains all active alerts across the entire network.
type AllAlertsResponse struct {
	Alerts []ServiceAlertResponse `json:"alerts"`
	Total  int                    `json:"total"`
}

// ToSystemAlertsResponse converts a slice of models.ServiceAlert
// to a SystemAlertsResponse DTO.
func ToSystemAlertsResponse(alerts []models.ServiceAlert) SystemAlertsResponse {
	response := SystemAlertsResponse{
		Alerts: make([]ServiceAlertResponse, len(alerts)),
		Total:  len(alerts),
	}
	for i, a := range alerts {
		response.Alerts[i] = ToServiceAlertResponse(a)
	}
	return response
}

// ToAllAlertsResponse converts a slice of models.ServiceAlert
// to an AllAlertsResponse DTO.
func ToAllAlertsResponse(alerts []models.ServiceAlert) AllAlertsResponse {
	response := AllAlertsResponse{
		Alerts: make([]ServiceAlertResponse, len(alerts)),
		Total:  len(alerts),
	}
	for i, a := range alerts {
		response.Alerts[i] = ToServiceAlertResponse(a)
	}
	return response
}

// ToServiceAlertResponse converts a models.ServiceAlert
// to a ServiceAlertResponse DTO.
func ToServiceAlertResponse(a models.ServiceAlert) ServiceAlertResponse {
	return ServiceAlertResponse{
		AlertID:         a.AlertID,
		Cause:           a.Cause,
		Effect:          a.Effect,
		HeaderText:      a.HeaderText,
		DescriptionText: a.DescriptionText,
		StartTime:       toUTCPtr(a.StartTime),
		EndTime:         toUTCPtr(a.EndTime),
	}
}

// ToAlertListResponse converts a slice of models.ServiceAlert
// to an AlertListResponse DTO.
func ToAlertListResponse(routeID string, alerts []models.ServiceAlert) AlertListResponse {
	response := AlertListResponse{
		RouteID: routeID,
		Alerts:  make([]ServiceAlertResponse, len(alerts)),
		Total:   len(alerts),
	}

	for i, a := range alerts {
		response.Alerts[i] = ToServiceAlertResponse(a)
	}

	return response
}
