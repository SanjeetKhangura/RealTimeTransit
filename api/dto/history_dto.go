package dto

import (
	"time"

	"realtimetransit/models"
)

// HistoryPointResponse is the JSON shape for one time-bucketed data point.
// Used by the reliability chart on the route detail page.
// AvgDelaySecs is positive for late buses, negative for early buses.
type HistoryPointResponse struct {
	Bucket       time.Time `json:"bucket"`
	AvgDelaySecs float64   `json:"avgDelaySecs"`
	SampleSize   int       `json:"sampleSize"`
}

// RouteHistoryResponse is the JSON shape returned by
// GET /api/routes/{id}/history
type RouteHistoryResponse struct {
	RouteID string                 `json:"routeId"`
	From    time.Time              `json:"from"`
	To      time.Time              `json:"to"`
	Bucket  string                 `json:"bucket"`
	Points  []HistoryPointResponse `json:"points"`
	Total   int                    `json:"total"`
}

// ToHistoryPointResponse converts a models.HistoryPoint to a HistoryPointResponse DTO.
func ToHistoryPointResponse(p models.HistoryPoint) HistoryPointResponse {
	return HistoryPointResponse{
		Bucket:       toUTC(p.Bucket),
		AvgDelaySecs: p.AvgDelaySecs,
		SampleSize:   p.SampleSize,
	}
}

// ToRouteHistoryResponse converts a slice of models.HistoryPoint
// to a RouteHistoryResponse DTO.
func ToRouteHistoryResponse(
	routeID string,
	from time.Time,
	to time.Time,
	bucket string,
	points []models.HistoryPoint,
) RouteHistoryResponse {
	response := RouteHistoryResponse{
		RouteID: routeID,
		From:    from.UTC(),
		To:      to.UTC(),
		Bucket:  bucket,
		Points:  make([]HistoryPointResponse, len(points)),
		Total:   len(points),
	}

	for i, p := range points {
		response.Points[i] = ToHistoryPointResponse(p)
	}

	return response
}
