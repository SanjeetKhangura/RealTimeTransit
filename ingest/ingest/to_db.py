import logging
from datetime import datetime

import psycopg
from psycopg import sql
from google.transit import gtfs_realtime_pb2


def seconds_to_hms(seconds):
    """
    Convert seconds after midnight to HH:MM:SS
    """
    if seconds is None:
        return None
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return "{:02d}:{:02d}:{:02d}".format(hours, minutes, secs)


def feed_version_exists(conn, feed_version):
    """
    True if feed_version already exists.
    """
    if not feed_version:
        return False
    
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM gtfs_datasets WHERE feed_version = %s LIMIT 1",
            (feed_version,)
        )
        return cur.fetchone() is not None


def insert_static_data(conn, static_schedule):
    """
    Insert static GTFS data into the database
    """
    fi = static_schedule.get('feed_info', {})
    feed_version = fi.get('feed_version')
    feed_start = fi.get('feed_start_date')
    feed_end = fi.get('feed_end_date')
    
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO gtfs_datasets (feed_version, start_date, end_date, description) VALUES (%s, %s, %s, %s) RETURNING dataset_id",
            (feed_version, feed_start, feed_end, "GTFS feed version {}".format(feed_version))
        )
        dataset_id = cur.fetchone()[0]
        logging.info("Created dataset_id {} for feed_version {}".format(dataset_id, feed_version))
        
        # feed_info
        if fi:
            cur.execute(
                """INSERT INTO feed_info 
                   (dataset_id, feed_publisher_name, feed_publisher_url, feed_lang, default_lang, 
                    feed_start_date, feed_end_date, feed_version)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (dataset_id, fi['feed_publisher_name'], fi['feed_publisher_url'], fi['feed_lang'],
                 fi.get('default_lang'), fi.get('feed_start_date'), fi.get('feed_end_date'), fi.get('feed_version'))
            )
        
        # calendar 
        if static_schedule.get('calendar'):
            calendar_rows = [
                (dataset_id, c['service_id'], c['monday'], c['tuesday'], c['wednesday'], 
                 c['thursday'], c['friday'], c['saturday'], c['sunday'], c['start_date'], c['end_date'])
                for c in static_schedule['calendar']
            ]
            cur.executemany(
                """INSERT INTO calendar (dataset_id, service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                calendar_rows
            )
            logging.debug("Inserted {} calendar records".format(len(calendar_rows)))
        
        # calendar_dates 
        if static_schedule.get('calendar_dates'):
            calendar_dates_rows = [
                (dataset_id, cd['service_id'], cd['date'], cd['exception_type'])
                for cd in static_schedule['calendar_dates']
            ]
            cur.executemany(
                "INSERT INTO calendar_dates (dataset_id, service_id, date, exception_type) VALUES (%s, %s, %s, %s)",
                calendar_dates_rows
            )
            logging.debug("Inserted {} calendar_dates records".format(len(calendar_dates_rows)))
        
        # stops
        if static_schedule.get('stops'):
            stops_rows = [
                (dataset_id, s['stop_id'], s['stop_name'], s['stop_lat'], s['stop_lon'],
                 "SRID=4326;POINT({} {})".format(s['stop_lon'], s['stop_lat']) if (s['stop_lon'] and s['stop_lat']) else None,
                 s.get('stop_code'), s.get('stop_desc'), s.get('wheelchair_boarding'))
                for s in static_schedule['stops']
            ]
            cur.executemany(
                """INSERT INTO stops (dataset_id, stop_id, stop_name, stop_lat, stop_lon, geom, stop_code, stop_desc, wheelchair_boarding)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                stops_rows
            )
            logging.debug("Inserted {} stops".format(len(stops_rows)))
        
        # routes
        if static_schedule.get('routes'):
            routes_rows = [
                (dataset_id, r['route_id'], r.get('route_short_name'), r.get('route_long_name'), r['route_type'],
                 r.get('route_desc'), r.get('route_url'), r.get('route_color'), r.get('route_text_color'))
                for r in static_schedule['routes']
            ]
            cur.executemany(
                """INSERT INTO routes (dataset_id, route_id, route_short_name, route_long_name, route_type, route_desc, route_url, route_color, route_text_color)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                routes_rows
            )
            logging.debug("Inserted {} routes".format(len(routes_rows)))
        
        # trips
        if static_schedule.get('trips'):
            trips_rows = [
                (dataset_id, t['trip_id'], t['route_id'], t['service_id'], t.get('direction_id'),
                 t.get('trip_headsign'), t.get('shape_id'), t.get('wheelchair_accessible'), t.get('bikes_allowed'))
                for t in static_schedule['trips']
            ]
            cur.executemany(
                """INSERT INTO trips (dataset_id, trip_id, route_id, service_id, direction_id, trip_headsign, shape_id, wheelchair_accessible, bikes_allowed)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                trips_rows
            )
            logging.debug("Inserted {} trips".format(len(trips_rows)))
        
        # stop_times
        if static_schedule.get('stop_times'):
            stop_times_rows = [
                (dataset_id, st['trip_id'], st['stop_sequence'], st['stop_id'], st.get('arrival_seconds'), st.get('departure_seconds'),
                 st.get('pickup_type'), st.get('drop_off_type'), st.get('shape_dist_traveled'))
                for st in static_schedule['stop_times']
            ]
            cur.executemany(
                """INSERT INTO stop_times (dataset_id, trip_id, stop_sequence, stop_id, arrival_seconds, departure_seconds, pickup_type, drop_off_type, shape_dist_traveled)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                stop_times_rows
            )
            logging.debug("Inserted {} stop_times".format(len(stop_times_rows)))
        
        # shapes
        if static_schedule.get('shapes'):
            shapes_rows = [
                (dataset_id, sh['shape_id'], sh['shape_pt_sequence'],
                 "SRID=4326;POINT({} {})".format(sh['shape_pt_lon'], sh['shape_pt_lat']),
                 sh.get('shape_dist_traveled'))
                for sh in static_schedule['shapes']
            ]
            cur.executemany(
                "INSERT INTO shapes (dataset_id, shape_id, shape_pt_sequence, geom, shape_dist_traveled) VALUES (%s, %s, %s, %s, %s)",
                shapes_rows
            )
            logging.debug("Inserted {} shape points".format(len(shapes_rows)))


def store_feed_data(feed, db_connection_string, static_schedule=None):
    """
    Stores feed and schedule in the database
    """
    logging.info("Storing feed data to database")
    
    try:
        with psycopg.connect(db_connection_string) as conn:
            # static schedule data
            if static_schedule:
                feed_info = static_schedule.get('feed_info', {})
                feed_version = feed_info.get('feed_version')
                
                with conn.transaction():
                    if feed_version and feed_version_exists(conn, feed_version):
                        logging.info("Feed version {} already imported; skipping static data".format(feed_version))
                    else:
                        logging.info("Importing static schedule")
                        insert_static_data(conn, static_schedule)
                        logging.info("Static schedule import complete")
            
            # Parse realtime feed data
            vehicle_position_rows = []
            trip_update_rows = []
            service_alert_rows = []
            
            current_time = datetime.now().astimezone() 
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
                        gtfs_realtime_pb2.VehiclePosition.VehicleStopStatus.Name(v.current_status) if v.HasField('current_status') else None,  # yay enums
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
                            current_time,  # observation time for the hypertable
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
                        current_time,  # observation time for the hypertable
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
            
            # Insert realtime data
            with conn.transaction():
                with conn.cursor() as cur:
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
            
            logging.info("Successfully stored feed data: {} vehicles, {} trip updates, {} alerts".format(len(vehicle_position_rows), len(trip_update_rows), len(service_alert_rows)))
    
    except psycopg.Error as e:
        logging.exception("Database error while storing feed data: {}".format(e))
        raise
    except Exception as e:
        logging.exception("Unexpected error while storing feed data: {}".format(e))
        raise
