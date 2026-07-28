package models

// ShapePoint represents one coordinate point on a route shape.
// Not a database table - extracted from the shape_paths materialized
// view by decomposing the LineString geometry into individual points.
type ShapePoint struct {
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	Sequence int     `json:"sequence"`
}

// RouteShape holds the representative shape for a route.
// Not a database table - assembled by the service layer from
// shape_paths via the most common shape_id across trips for the route.
type RouteShape struct {
	RouteID string       `json:"routeId"`
	ShapeID string       `json:"shapeId"`
	Points  []ShapePoint `json:"points"`
	Total   int          `json:"total"`
}
