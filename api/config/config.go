package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
}

// Load reads environment variables and returns a Config.
func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found — reading from environment variables")
	}

	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnvRequired("DATABASE_URL"),
	}
}

// getEnv returns the env variable value or a default.
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// getEnvRequired exits immediately if the variable is not set.
func getEnvRequired(key string) string {
	value, exists := os.LookupEnv(key)
	if !exists || value == "" {
		log.Fatalf("Required environment variable %s is not set", key)
	}
	return value
}
