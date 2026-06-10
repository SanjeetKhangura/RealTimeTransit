package handlers

import (
	"net/http"

	"realtimetransit/dto"
	"realtimetransit/service"

	"github.com/gin-gonic/gin"
)

type RouteHandler struct {
	routeService *service.RouteService
}

func NewRouteHandler(routeService *service.RouteService) *RouteHandler {
	return &RouteHandler{routeService: routeService}
}

func (h *RouteHandler) GetAllRoutes(c *gin.Context) {
	routes, err := h.routeService.GetAllRoutes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch routes",
		})
		return
	}

	c.JSON(http.StatusOK, dto.ToRouteListResponse(routes))
}

func (h *RouteHandler) GetRouteByID(c *gin.Context) {
	routeID := c.Param("id")

	route, err := h.routeService.GetRouteByID(c.Request.Context(), routeID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "route not found",
		})
		return
	}

	c.JSON(http.StatusOK, dto.ToRouteResponse(route))
}
