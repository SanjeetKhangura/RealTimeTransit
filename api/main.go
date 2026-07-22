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
	vehicleRepo := repository.NewVehicleRepository(db.Pool)
	tripRepo := repository.NewTripRepository(db.Pool)
	routeService := service.NewRouteService(routeRepo, vehicleRepo, tripRepo)
	routeHandler := handlers.NewRouteHandler(routeService)

	vehicleService := service.NewVehicleService(vehicleRepo)
	vehicleHandler := handlers.NewVehicleHandler(vehicleService)

	tripService := service.NewTripService(tripRepo, routeRepo)
	tripHandler := handlers.NewTripHandler(tripService)

	alertRepo := repository.NewAlertRepository(db.Pool)
	alertService := service.NewAlertService(alertRepo)
	alertHandler := handlers.NewAlertHandler(alertService)

	stopRepo := repository.NewStopRepository(db.Pool)
	stopService := service.NewStopService(stopRepo, routeRepo)
	stopHandler := handlers.NewStopHandler(stopService)

	historyService := service.NewHistoryService(tripRepo)
	historyHandler := handlers.NewHistoryHandler(historyService)

	shapeRepo := repository.NewShapeRepository(db.Pool)
	shapeService := service.NewShapeService(shapeRepo, routeRepo)
	shapeHandler := handlers.NewShapeHandler(shapeService)

	statusService := service.NewStatusService(tripRepo, vehicleRepo, alertRepo, routeRepo)
	statusHandler := handlers.NewStatusHandler(statusService)

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

	huma.Register(api, huma.Operation{
		OperationID: "get-trip-updates",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/trip-updates",
		Summary:     "Get trip updates for a route",
		Tags:        []string{"trips"},
	}, tripHandler.GetTripUpdates)

	huma.Register(api, huma.Operation{
		OperationID: "get-trips",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/trips",
		Summary:     "Get trips for a route",
		Tags:        []string{"trips"},
	}, tripHandler.GetTrips)

	huma.Register(api, huma.Operation{
		OperationID: "get-active-alerts",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/alerts",
		Summary:     "Get active service alerts for a route",
		Tags:        []string{"alerts"},
	}, alertHandler.GetActiveAlerts)

	huma.Register(api, huma.Operation{
		OperationID: "get-stops",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/stops",
		Summary:     "Get stops with scheduled and real-time arrival times for a route",
		Tags:        []string{"stops"},
	}, stopHandler.GetStops)

	huma.Register(api, huma.Operation{
		OperationID: "get-route-history",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/history",
		Summary:     "Get historical reliability data for a route",
		Tags:        []string{"history"},
	}, historyHandler.GetRouteHistory)

	huma.Register(api, huma.Operation{
		OperationID: "get-system-alerts",
		Method:      http.MethodGet,
		Path:        "/api/alerts/system",
		Summary:     "Get active system wide alerts for the entire agency",
		Tags:        []string{"alerts"},
	}, alertHandler.GetSystemAlerts)

	huma.Register(api, huma.Operation{
		OperationID: "get-all-alerts",
		Method:      http.MethodGet,
		Path:        "/api/alerts",
		Summary:     "Get all active alerts across the entire network",
		Tags:        []string{"alerts"},
	}, alertHandler.GetAllAlerts)

	huma.Register(api, huma.Operation{
		OperationID: "get-route-shape",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/shape",
		Summary:     "Get the representative shape polyline for a route",
		Tags:        []string{"shapes"},
	}, shapeHandler.GetRouteShape)

	huma.Register(api, huma.Operation{
		OperationID: "get-trip-schedule",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/trips/schedule",
		Summary:     "Get schedule summary for all trips on a route to help pick an active trip",
		Tags:        []string{"trips"},
	}, tripHandler.GetTripSchedule)

	huma.Register(api, huma.Operation{
		OperationID: "get-route-status",
		Method:      http.MethodGet,
		Path:        "/api/routes/{id}/status",
		Summary:     "Get the current status of a route",
		Tags:        []string{"status"},
	}, statusHandler.GetRouteStatus)

	huma.Register(api, huma.Operation{
		OperationID: "get-all-route-statuses",
		Method:      http.MethodGet,
		Path:        "/api/routes/status",
		Summary:     "Get the current status of all routes",
		Tags:        []string{"status"},
	}, statusHandler.GetAllRouteStatuses)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Transit API starting on %s", addr)
	log.Printf("OpenAPI docs available at http://localhost%s/docs", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
