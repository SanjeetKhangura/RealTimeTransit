import logging
from datetime import datetime

import psycopg
from google.transit import gtfs_realtime_pb2


def store_feed_data(feed, db_connection_string):
    """Stores the feed data into the database"""
    logging.info("Storing feed data to database")
    # temp dump to console
    #logging.debug("Feed content: {}".format(repr(feed)))

    vehicle_position_rows = []
    trip_update_rows = []
    service_alert_rows = []

    current_time = datetime.now().astimezone() # TODO: extract tz from gtfs instead of assuming we're in the same tz as the agency (even though we are)

    # https://gtfs.org/documentation/realtime/reference/

    for entity in feed.entity:

        # for vehicle_positions
        if entity.HasField('vehicle'):
            v = entity.vehicle
            ts = datetime.fromtimestamp(v.timestamp).astimezone() if v.timestamp else current_time

            # apparently, postgis wants this particular format (and the magic number is the coordinate system)
            geom = "SRID=4326;POINT({} {})".format(v.position.longitude, v.position.latitude) if v.position.longitude and v.position.latitude else None

            vehicle_position_rows.append((
                ts,
                v.vehicle.id if v.vehicle.id else None,
                v.trip.trip_id if v.HasField('trip') else None,
                v.trip.route_id if v.HasField('trip') else None,
                v.position.latitude if v.HasField('position') else None,
                v.position.longitude if v.HasField('position') else None,
                geom,
                v.position.bearing if v.HasField('position') else None,
                v.position.speed if v.HasField('position') else None,
                gtfs_realtime_pb2.VehiclePosition.VehicleStopStatus.Name(v.current_status) if v.HasField('current_status') else None, # yay enums
                v.current_stop_sequence if v.HasField('current_stop_sequence') else None,
                v.stop_id if v.HasField('stop_id') else None,
                gtfs_realtime_pb2.VehiclePosition.CongestionLevel.Name(v.congestion_level) if v.HasField('congestion_level') else None
            ))

        # for trip_updates
        if entity.HasField('trip_update'):
            tu = entity.trip_update
            # unpack stop time updates from each bus into individual rows
            for stu in tu.stop_time_update:
                rel_str = gtfs_realtime_pb2.TripUpdate.StopTimeUpdate.ScheduleRelationship.Name(stu.schedule_relationship) if stu.HasField('schedule_relationship') else None

                arr_time = datetime.fromtimestamp(stu.arrival.time).astimezone() if stu.HasField('arrival') and stu.arrival.time else None
                dep_time = datetime.fromtimestamp(stu.departure.time).astimezone() if stu.HasField('departure') and stu.departure.time else None

                trip_update_rows.append((
                    current_time, # observation time for the hypertable
                    tu.trip.trip_id,
                    tu.trip.route_id if tu.HasField('trip') else None,
                    stu.stop_id,
                    stu.stop_sequence if stu.HasField('stop_sequence') else None,
                    stu.arrival.delay if stu.HasField('arrival') else None,
                    arr_time,
                    stu.departure.delay if stu.HasField('departure') else None,
                    dep_time,
                    rel_str
                ))

        # for service_alerts
        if entity.HasField('alert'):
            a = entity.alert

            # first active period (if available)
            start_time = datetime.fromtimestamp(a.active_period[0].start).astimezone() if a.active_period and a.active_period[0].start else None
            end_time = datetime.fromtimestamp(a.active_period[0].end).astimezone() if a.active_period and a.active_period[0].end else None

            # enums
            cause_str = gtfs_realtime_pb2.Alert.Cause.Name(a.cause) if a.HasField('cause') else None
            effect_str = gtfs_realtime_pb2.Alert.Effect.Name(a.effect) if a.HasField('effect') else None

            # use first translation string for text fields
            header_text = a.header_text.translation[0].text if a.HasField('header_text') and a.header_text.translation else None
            desc_text = a.description_text.translation[0].text if a.HasField('description_text') and a.description_text.translation else None

            service_alert_rows.append((
                current_time, # observation time for the hypertable
                entity.id,
                cause_str,
                effect_str,
                header_text,
                desc_text,
                start_time,
                end_time
            ))
    # end of for loop
    logging.debug("Parsed feed: vehicle_position_rows ({}), trip_update_rows ({}), service_alert_rows ({})".format(len(vehicle_position_rows), len(trip_update_rows), len(service_alert_rows)))

    # according to timescaledb themselves, copy is the most efficient way to dump data into postgres (https://www.tigerdata.com/learn/testing-postgres-ingest-insert-vs-batch-insert-vs-copy)
    try:
        with psycopg.connect(db_connection_string) as conn:
            # TODO: some kind of schema validation so the script doesn't blow up the db if it runs right after we change it
            with conn.cursor() as cur:
                logging.debug("Connected to DB: {}".format(repr(conn.info)))

                if vehicle_position_rows:
                    logging.debug("Copying {} vehicle positions".format(len(vehicle_position_rows)))
                    with cur.copy("COPY vehicle_positions (ts, vehicle_id, trip_id, route_id, lat, lon, geom, bearing, speed, current_status, current_stop_sequence, stop_id, congestion_level) FROM STDIN") as copy:
                        for row in vehicle_position_rows:
                            copy.write_row(row)

                if trip_update_rows:
                    logging.debug("Copying {} trip updates".format(len(trip_update_rows)))
                    with cur.copy("COPY trip_updates (ts, trip_id, route_id, stop_id, stop_sequence, arrival_delay, arrival_time, departure_delay, departure_time, schedule_relationship) FROM STDIN") as copy:
                        for row in trip_update_rows:
                            copy.write_row(row)

                if service_alert_rows:
                    logging.debug("Copying {} service alerts".format(len(service_alert_rows)))
                    with cur.copy("COPY service_alerts (ts, alert_id, cause, effect, header_text, description_text, start_time, end_time) FROM STDIN") as copy:
                        for row in service_alert_rows:
                            copy.write_row(row)

            conn.commit()
            logging.info("Successfully stored feed data: {} vehicles, {} trip updates, {} alerts".format(len(vehicle_position_rows), len(trip_update_rows), len(service_alert_rows)))

    except psycopg.Error as e:
        logging.exception("Database error while storing feed data: {}".format(e))
    except Exception as e:
        logging.exception("Unexpected error while storing feed data: {}".format(e))
