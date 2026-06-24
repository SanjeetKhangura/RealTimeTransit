package dto

import "realtimetransit/models"

type RouteResponse struct {
	RouteID   string `json:"routeId"`
	ShortName string `json:"shortName"`
	LongName  string `json:"longName"`
	RouteType *int   `json:"routeType"`
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
