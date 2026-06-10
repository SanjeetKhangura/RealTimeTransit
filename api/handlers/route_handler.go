package handlers

import (
	"net/http"
	"strings"

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

// GetAllRoutes handles GET /api/routes
func (h *RouteHandler) GetAllRoutes(c *gin.Context) {
	routes, err := h.routeService.GetAllRoutes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.ToRouteListResponse(routes))
}

// GetRouteByID handles GET /api/routes/:id
func (h *RouteHandler) GetRouteByID(c *gin.Context) {
	routeID := c.Param("id")

	route, err := h.routeService.GetRouteByID(c.Request.Context(), routeID)
	if err != nil {
		// Return 404 only when the route genuinely does not exist
		// Return 500 for any real database failure
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch route",
		})
		return
	}

	c.JSON(http.StatusOK, dto.ToRouteResponse(route))
}
