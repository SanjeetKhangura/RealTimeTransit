package models

import "time"

type GtfsDataset struct {
	DatasetID   int       `db:"dataset_id"  json:"datasetId"`
	ImportDate  time.Time `db:"import_date" json:"importDate"`
	StartDate   time.Time `db:"start_date"  json:"startDate"`
	EndDate     time.Time `db:"end_date"    json:"endDate"`
	Description string    `db:"description" json:"description"`
}
