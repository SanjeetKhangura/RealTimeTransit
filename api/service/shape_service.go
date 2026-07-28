package service

import (
	"context"
	"errors"
	"fmt"

	"realtimetransit/models"
	"realtimetransit/repository"

	"github.com/jackc/pgx/v5"
)

// ShapeService handles business logic for route shapes.
type ShapeService struct {
	shapeRepo *repository.ShapeRepository
	routeRepo *repository.RouteRepository
}

func NewShapeService(
	shapeRepo *repository.ShapeRepository,
	routeRepo *repository.RouteRepository,
) *ShapeService {
	return &ShapeService{
		shapeRepo: shapeRepo,
		routeRepo: routeRepo,
	}
}

// GetRouteShape returns the representative shape for a given route.
// Resolves the latest dataset ID, finds the most common shape_id
// across trips for the route, then fetches the ordered lat/lon points
// from the shape_paths materialized view.
func (s *ShapeService) GetRouteShape(ctx context.Context, routeID string) (models.RouteShape, error) {
	datasetID, err := s.routeRepo.GetLatestDatasetID(ctx)
	if err != nil {
		return models.RouteShape{}, fmt.Errorf("getting latest dataset: %w", err)
	}

	shapeID, err := s.shapeRepo.GetMostCommonShapeIDForRoute(ctx, routeID, datasetID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.RouteShape{}, fmt.Errorf("no shape found for route %s", routeID)
		}
		return models.RouteShape{}, fmt.Errorf("getting shape id for route %s: %w", routeID, err)
	}

	points, err := s.shapeRepo.GetShapePoints(ctx, shapeID, datasetID)
	if err != nil {
		return models.RouteShape{}, fmt.Errorf("getting shape points for route %s: %w", routeID, err)
	}

	return models.RouteShape{
		RouteID: routeID,
		ShapeID: shapeID,
		Points:  points,
		Total:   len(points),
	}, nil
}
