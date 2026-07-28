package dto

import (
	"time"

	"realtimetransit/service"
)

// RouteResponse is the JSON shape returned for a single route.
type RouteResponse struct {
	RouteID     string     `json:"routeId"`
	ShortName   string     `json:"shortName"`
	LongName    string     `json:"longName"`
	RouteType   *int       `json:"routeType"`
	Status      string     `json:"status"`
	HealthScore float64    `json:"healthScore"`
	LastUpdated *time.Time `json:"lastUpdated"`
	DataSource  string     `json:"dataSource"`
}

// RouteListItem is the JSON shape for a single route in the list.
// Simpler than RouteResponse — no lastUpdated per route in list view.
type RouteListItem struct {
	RouteID     string  `json:"routeId"`
	ShortName   string  `json:"shortName"`
	LongName    string  `json:"longName"`
	RouteType   *int    `json:"routeType"`
	Status      string  `json:"status"`
	HealthScore float64 `json:"healthScore"`
}

// RouteListResponse is the JSON shape returned by GET /api/routes.
type RouteListResponse struct {
	Routes []RouteListItem `json:"routes"`
	Total  int             `json:"total"`
}

// ToRouteResponse converts a service.RouteDetail to a RouteResponse DTO.
func ToRouteResponse(detail service.RouteDetail) RouteResponse {
	dataSource := "scheduled"
	if detail.LastUpdated != nil {
		dataSource = "realtime"
	}

	return RouteResponse{
		RouteID:     detail.Route.RouteID,
		ShortName:   detail.Route.ShortName,
		LongName:    detail.Route.LongName,
		RouteType:   detail.Route.RouteType,
		Status:      detail.Status,
		HealthScore: detail.HealthScore,
		LastUpdated: toUTCPtr(detail.LastUpdated),
		DataSource:  dataSource,
	}
}

// ToRouteListItem converts a service.RouteWithStatus to a RouteListItem DTO.
func ToRouteListItem(r service.RouteWithStatus) RouteListItem {
	return RouteListItem{
		RouteID:     r.Route.RouteID,
		ShortName:   r.Route.ShortName,
		LongName:    r.Route.LongName,
		RouteType:   r.Route.RouteType,
		Status:      r.Status,
		HealthScore: r.HealthScore,
	}
}

// ToRouteListResponse converts a slice of service.RouteWithStatus
// to a RouteListResponse DTO.
func ToRouteListResponse(routes []service.RouteWithStatus) RouteListResponse {
	response := RouteListResponse{
		Routes: make([]RouteListItem, len(routes)),
		Total:  len(routes),
	}

	for i, r := range routes {
		response.Routes[i] = ToRouteListItem(r)
	}

	return response
}
