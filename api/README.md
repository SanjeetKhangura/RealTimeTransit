# Transit API

Go REST API for the Real-Time Transit System.

## Requirements

- Go 1.26+

## Setup

Create a `.env` file in the root of the project:

```env
PORT=8080
DATABASE_URL=postgresql://username:password@host:5432/dbname
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Run

```bash
go run main.go
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/routes | List all routes |
| GET | /api/routes/:id | Get route by ID |
