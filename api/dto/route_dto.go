package dto

import "realtimetransit/models"

type RouteResponse struct {
	RouteID   string `json:"route_id"`
	ShortName string `json:"short_name"`
	LongName  string `json:"long_name"`
	RouteType int    `json:"route_type"`
}

type RouteListResponse struct {
	Routes []RouteResponse `json:"routes"`
	Total  int             `json:"total"`
}

func ToRouteResponse(r models.Route) RouteResponse {
	return RouteResponse{
		RouteID:   r.RouteID,
		ShortName: r.ShortName,
		LongName:  r.LongName,
		RouteType: r.RouteType,
	}
}

func ToRouteListResponse(routes []models.Route) RouteListResponse {
	response := RouteListResponse{
		Routes: make([]RouteResponse, len(routes)),
		Total:  len(routes),
	}

	for i, r := range routes {
		response.Routes[i] = ToRouteResponse(r)
	}

	return response
}
