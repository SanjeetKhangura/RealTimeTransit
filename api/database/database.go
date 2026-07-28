package database

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps pgxpool.Pool.
// Wrapping lets us add helper methods without changing every call site.
type DB struct {
	Pool *pgxpool.Pool
}

// Connect creates a connection pool to TimescaleDB.
func Connect(databaseURL string) *DB {
	log.Println("Connecting to database...")

	// context.Background() is used for the initial connection only.
	// All subsequent queries will use request-scoped contexts.
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("Failed to create connection pool: %v", err)
	}

	// Verify the connection actually works before proceeding.
	// Fails fast rather than returning a pool that silently doesn't work.
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Database connected successfully")
	return &DB{Pool: pool}
}

// Close shuts down the connection pool cleanly.
// Called via defer in main.go when the server shuts down.
func (db *DB) Close() {
	db.Pool.Close()
}

// HealthCheck verifies the connection is still alive.
// Called by the /health endpoint.
func (db *DB) HealthCheck() error {
	if err := db.Pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}
	return nil
}
