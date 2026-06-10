package models

type Route struct {
	DatasetID int    `db:"dataset_id"      json:"dataset_id"`
	RouteID   string `db:"route_id"         json:"route_id"`
	ShortName string `db:"route_short_name" json:"short_name"`
	LongName  string `db:"route_long_name"  json:"long_name"`
	RouteType int    `db:"route_type"       json:"route_type"`
}
