package models

import "time"

type GtfsDataset struct {
	DatasetID   int       `db:"dataset_id"`
	ImportDate  time.Time `db:"import_date"`
	StartDate   time.Time `db:"start_date"`
	EndDate     time.Time `db:"end_date"`
	Description string    `db:"description"`
}
