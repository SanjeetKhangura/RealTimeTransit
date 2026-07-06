package handlers

import (
	"context"
	"net/http"
	"strings"

	"realtimetransit/dto"
	"realtimetransit/service"

	"github.com/danielgtaylor/huma/v2"
)

// RouteHandler handles route endpoints registered with Huma.
// Receives a RouteService via dependency injection.
type RouteHandler struct {
	routeService *service.RouteService
}

// NewRouteHandler creates a new RouteHandler.
// Called in main.go when wiring dependencies.
func NewRouteHandler(routeService *service.RouteService) *RouteHandler {
	return &RouteHandler{routeService: routeService}
}

// GetAllRoutesInput has no parameters.
// Huma still requires an input struct even when empty.
type GetAllRoutesInput struct{}

// GetAllRoutesOutput wraps the response body.
// Huma uses the Body field to generate the OpenAPI schema.
type GetAllRoutesOutput struct {
	Body dto.RouteListResponse
}

// GetAllRoutes handles GET /api/routes
// Returns all routes with total count.
// Frontend polls this every 60s for the route list page.
func (h *RouteHandler) GetAllRoutes(ctx context.Context, input *GetAllRoutesInput) (*GetAllRoutesOutput, error) {
	routes, err := h.routeService.GetAllRoutes(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, err.Error())
	}

	return &GetAllRoutesOutput{
		Body: dto.ToRouteListResponse(routes),
	}, nil
}

// GetRouteByIDInput defines the path parameter for a single route.
// Huma reads the path tag to bind /api/routes/{id}
type GetRouteByIDInput struct {
	RouteID string `path:"id" doc:"GTFS route ID"`
}

// GetRouteByIDOutput wraps the response body.
type GetRouteByIDOutput struct {
	Body dto.RouteResponse
}

// GetRouteByID handles GET /api/routes/{id}
// Returns a single route by its route_id with freshness metadata.
// Frontend polls this every 30s for the route detail page header.
func (h *RouteHandler) GetRouteByID(ctx context.Context, input *GetRouteByIDInput) (*GetRouteByIDOutput, error) {
	detail, err := h.routeService.GetRouteByID(ctx, input.RouteID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, huma.NewError(http.StatusNotFound, err.Error())
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch route")
	}

	return &GetRouteByIDOutput{
		Body: dto.ToRouteResponse(detail),
	}, nil
}
