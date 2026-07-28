package handlers

import (
	"context"
	"fmt"
	"net/http"
	"realtimetransit/service"
	"realtimetransit/dto"
	"github.com/danielgtaylor/huma/v2"
)

type BunchingHandler struct {
	bunchingService *service.BunchingService
}

func NewBunchingHandler(bunchingService *service.BunchingService) *BunchingHandler {
	return &BunchingHandler{
		bunchingService: bunchingService,
	}
}

type GetBunchingInput struct {
	RouteID string `path:"id" docs:"GTFS route ID"`
}

type GetBunchingOutput struct {
	Body dto.BunchingResponse
}

func (h *BunchingHandler) GetBunchingPairsByRoute(c context.Context, input *GetBunchingInput) (*GetBunchingOutput, error) {
	pairs, err := h.bunchingService.GetBunchingPairsByRoute(c, input.RouteID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, fmt.Sprintf("Error getting bunching pairs for route %s: %v", input.RouteID, err))
	}

	return &GetBunchingOutput{
		Body: dto.ToBunchingResponse(input.RouteID, pairs),
	}, nil
}