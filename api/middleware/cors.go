package middleware

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS(allowedOrigin string) gin.HandlerFunc {
	return cors.New(cors.Config{

		AllowOrigins: []string{allowedOrigin},

		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},

		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},

		MaxAge: 12 * time.Hour,
	})
}
