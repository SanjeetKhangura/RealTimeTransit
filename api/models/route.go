package models

type Route struct {
	DatasetID int    `db:"dataset_id"       json:"datasetId"`
	RouteID   string `db:"route_id"         json:"routeId"`
	ShortName string `db:"route_short_name" json:"shortName"`
	LongName  string `db:"route_long_name"  json:"longName"`
	RouteType int    `db:"route_type"       json:"routeType"`
}
