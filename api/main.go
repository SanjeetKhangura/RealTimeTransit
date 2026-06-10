package main

import (
	"fmt"
	"log"
	"net/http"

	"realtimetransit/config"
	"realtimetransit/database"
	"realtimetransit/handlers"
	"realtimetransit/middleware"
	"realtimetransit/repository"
	"realtimetransit/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration from environment variables
	cfg := config.Load()

	// Connect to TimescaleDB
	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	// Wire dependencies — repository → service → handler
	routeRepo := repository.NewRouteRepository(db.Pool)
	routeService := service.NewRouteService(routeRepo)
	routeHandler := handlers.NewRouteHandler(routeService)

	// Create Gin router
	router := gin.Default()

	router.Use(middleware.CORS(cfg.CORSAllowedOrigins))

	// Health check endpoint
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

	// API routes
	api := router.Group("/api")
	{
		api.GET("/routes", routeHandler.GetAllRoutes)
		api.GET("/routes/:id", routeHandler.GetRouteByID)
	}

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Transit API starting on %s", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
