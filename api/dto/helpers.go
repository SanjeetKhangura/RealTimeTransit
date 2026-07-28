package dto

import "time"

// toUTC normalizes a time.Time value to UTC.
// All timestamps must cross the API as UTC ISO 8601 per the
// frontend contract. The frontend handles timezone display
// using date-fns + @date-fns/tz with America/Vancouver.
func toUTC(t time.Time) time.Time {
	return t.UTC()
}

// toUTCPtr normalizes a *time.Time pointer to UTC.
// Returns nil if the pointer is nil.
func toUTCPtr(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	utc := t.UTC()
	return &utc
}
