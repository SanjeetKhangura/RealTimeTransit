package main

import (
	"fmt"
	"log"
	"net/http"

	"realtimetransit/config"
	"realtimetransit/database"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration from environment variables
	cfg := config.Load()

	// Connect to TimescaleDB
	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	// Create Gin router
	router := gin.Default()

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

	// API route group all public endpoints live under /api
	api := router.Group("/api")
	{
		_ = api // prevents unused variable error until we add routes
	}

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Transit API starting on %s", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
