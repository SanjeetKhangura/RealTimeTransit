package handlers

import (
	"context"
	"net/http"
	"strings"

	"realtimetransit/models"
	"realtimetransit/service"

	"github.com/danielgtaylor/huma/v2"
)

type ShapeHandler struct {
	shapeService *service.ShapeService
}

func NewShapeHandler(shapeService *service.ShapeService) *ShapeHandler {
	return &ShapeHandler{shapeService: shapeService}
}

// GetRouteShapeInput defines the path parameter for the shape endpoint.
type GetRouteShapeInput struct {
	RouteID string `path:"id" doc:"GTFS route ID"`
}

// GetRouteShapeOutput wraps the response body.
// Points are returned as [lat, lon] pairs for direct Leaflet consumption.
type GetRouteShapeOutput struct {
	Body models.RouteShape
}

// GetRouteShape handles GET /api/routes/{id}/shape
// Returns the representative shape for a route as ordered lat/lon points.
// Uses the most common shape_id across trips for the route.
// Points are in [lat, lon] order for direct Leaflet consumption.
func (h *ShapeHandler) GetRouteShape(ctx context.Context, input *GetRouteShapeInput) (*GetRouteShapeOutput, error) {
	shape, err := h.shapeService.GetRouteShape(ctx, input.RouteID)
	if err != nil {
		if strings.Contains(err.Error(), "no shape found") {
			return nil, huma.NewError(http.StatusNotFound, err.Error())
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch route shape")
	}

	return &GetRouteShapeOutput{
		Body: shape,
	}, nil
}
