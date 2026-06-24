package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"

	"realtimetransit/config"
	"realtimetransit/database"
	"realtimetransit/handlers"
	"realtimetransit/middleware"
	"realtimetransit/repository"
	"realtimetransit/service"
)

func main() {
	// Load configuration from environment variables
	cfg := config.Load()

	// Connect to TimescaleDB
	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	// Wire dependencies: repository -> service -> handler
	routeRepo := repository.NewRouteRepository(db.Pool)
	routeService := service.NewRouteService(routeRepo)
	routeHandler := handlers.NewRouteHandler(routeService)

	vehicleRepo := repository.NewVehicleRepository(db.Pool)
	vehicleService := service.NewVehicleService(vehicleRepo)
	vehicleHandler := handlers.NewVehicleHandler(vehicleService)

	// Create Gin router
	router := gin.Default()

	router.Use(middleware.CORS(cfg.CORSAllowedOrigins))

	router.GET("/health", func(c *gin.Context) {
		if err := db.HealthCheck(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "unhealthy",
				"error":  err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "transit-api",
		})
	})

	// Wrap the Gin router with Huma
	apiConfig := huma.DefaultConfig("Real-Time Transit API", "1.0.0")
	api := humagin.New(router, apiConfig)

	// Register route endpoints with Huma
	huma.Register(api, huma.Operation{
		OperationID: "get-all-routes",
		Method:      http.MethodGet,
		Path:        "/api/routes",
		Summary:     "List all routes",
		Tags:        []string{"routes"},
	}, routeHandler.GetAllRoutes)

	huma.Register(api, huma.Operation{
		OperationID: "get-route-by-id",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}",
		Summary:     "Get a single route by ID",
		Tags:        []string{"routes"},
	}, routeHandler.GetRouteByID)

	huma.Register(api, huma.Operation{
		OperationID: "get-live-vehicles",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/live",
		Summary:     "Get live vehicle positions for a route",
		Tags:        []string{"vehicles"},
	}, vehicleHandler.GetLiveVehicles)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Transit API starting on %s", addr)
	log.Printf("OpenAPI docs available at http://localhost%s/docs", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
