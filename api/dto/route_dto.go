package dto

import (
	"realtimetransit/models"
	"time"
)

// LastUpdated and DataSource are freshness signals per frontend contract.
type RouteResponse struct {
	RouteID     string     `json:"routeId"`
	ShortName   string     `json:"shortName"`
	LongName    string     `json:"longName"`
	RouteType   *int       `json:"routeType"`
	LastUpdated *time.Time `json:"lastUpdated"`
	DataSource  string     `json:"dataSource"`
}

type RouteListResponse struct {
	Routes []RouteResponse `json:"routes"`
	Total  int             `json:"total"`
}

func ToRouteResponse(r models.Route, lastUpdated *time.Time) RouteResponse {
	dataSource := "scheduled"
	if lastUpdated != nil {
		dataSource = "realtime"
	}

	return RouteResponse{
		RouteID:     r.RouteID,
		ShortName:   r.ShortName,
		LongName:    r.LongName,
		RouteType:   r.RouteType,
		LastUpdated: toUTCPtr(lastUpdated),
		DataSource:  dataSource,
	}
}

func ToRouteListResponse(routes []models.Route) RouteListResponse {
	response := RouteListResponse{
		Routes: make([]RouteResponse, len(routes)),
		Total:  len(routes),
	}

	for i, r := range routes {
		// Route list does not include per-route freshness signal
		// that is only on the route detail endpoint
		response.Routes[i] = ToRouteResponse(r, nil)
	}

	return response
}
