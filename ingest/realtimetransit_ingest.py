#!/usr/bin/env python3

import logging
import os
import argparse
import requests
import psycopg
from datetime import datetime
from google.transit import gtfs_realtime_pb2

def parse_arguments():
    """Parses command line arguments and returns the parser and args"""
    parser = argparse.ArgumentParser(description='Ingest GTFS data')

    parser.add_argument(
        '--url', '-u',
        action='append',
        help='feed urls (endpoint=url); specify multiple times, for each endpoint'
    )

    parser.add_argument(
        '--validation_options', '-O',
        type=str,
        default=os.getenv('VALIDATION_OPTIONS'),
        help='json of validator config optoins'
    )
    parser.add_argument(
        '--static_schedule_url', '-S',
        type=str,
        default=os.getenv('STATIC_SCHEDULE_URL', "https://gtfs-static.translink.ca/gtfs/google_transit.zip"),
        help='url of the static schedule feed (future: compare version against db and update)'
    )


    parser.add_argument(
        '--api_key', '-k',
        type=str,
        default=os.getenv('API_KEY', ''),
        help='api key for gtfs feed'
    )

    # further reading:
    # https://www.psycopg.org/psycopg3/docs/api/connections.html#psycopg.Connection
    # https://www.postgresql.org/docs/current/libpq-envars.html
    # maybe 90% of this config code is completely unnecessary?

    parser.add_argument(
        '--db', '-d',
        type=str,
        help='postgresql (timescale) connection string; overrides individual options if provided',
        default=os.getenv('DB_CONNECTION_STRING')
    )
    parser.add_argument(
        '--db_host', '-H',
        type=str,
        default=os.getenv('DB_HOST', 'localhost'),
        help='database host'
    )
    parser.add_argument(
        '--db_port', '-P',
        type=int,
        default=int(os.getenv('DB_PORT', '5432')),
        help='database port'
    )
    parser.add_argument(
        '--db_name', '-N',
        type=str,
        default=os.getenv('DB_NAME', 'gtfs'),
        help='database name'
    )
    parser.add_argument(
        '--db_user', '-U',
        type=str,
        default=os.getenv('DB_USER', 'postgres'),
        help='database user'
    )
    parser.add_argument(
        '--db_password', '-p',
        type=str,
        default=os.getenv('DB_PASSWORD', 'password'),
        help='database password'
    )

    parser.add_argument(
        '--log_level', '-l',
        type=str,
        default=os.getenv('LOG_LEVEL', 'INFO'),
        help='logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='enable verbose logging (log level DEBUG)'
    )
    parser.add_argument(
        '--log_file', '-f',
        type=str,
        default=os.getenv('LOG_FILE', 'ingest{}.log'.format(datetime.now().strftime('%Y%m%d_%H%M%S'))),
        help='file to write logs to'
    )
    parser.add_argument(
        '--timeout', '-t',
        type=int,
        default=int(os.getenv('TIMEOUT', '10')),
        help='timeout for requests to the feed (in seconds)'
    )

    return parser, parser.parse_args()

def setup_logging(args):
    """Sets up logging"""
    logging.basicConfig(
        level=(logging.DEBUG if args.verbose else getattr(logging, args.log_level.upper(), logging.INFO)),
        handlers=[
            logging.FileHandler(args.log_file),
            logging.StreamHandler()
        ]
    )

def generate_db_connection_string(args):
    """Assembles the database connection string from arguments"""
    if args.db:
        return args.db
    
    return "postgresql://{}:{}@{}:{}/{}".format(
        args.db_user,
        args.db_password,
        args.db_host,
        args.db_port,
        args.db_name
    )

def collect_feed_urls(args, parser):
    """Collects the feed URLs based on environment variables and arguments."""
    base_url = os.getenv('GTFS_BASE_URL', 'https://gtfsapi.translink.ca/v3/')
    
    # Default feed endpoints (unless overridden)
    feed_urls = {
        'trip_updates': base_url + os.getenv('GTFS_ENDPOINT_TRIP_UPDATES', 'gtfsrealtime'),
        'vehicle_positions': base_url + os.getenv('GTFS_ENDPOINT_VEHICLE_POSITIONS', 'gtfsposition'),
        'service_alerts': base_url + os.getenv('GTFS_ENDPOINT_SERVICE_ALERTS', 'gtfsalerts'),
    }

    # Override if urls are supplied
    if args.url:
        for url_pair in args.url:
            if '=' in url_pair:
                # split on first only
                key, value = url_pair.split('=', 1)
                feed_urls[key.strip()] = value.strip()
            else:
                parser.error("Invalid URL format: '{}'. Expected key=value configuration.".format(url_pair))
    
    return feed_urls

def fetch_and_parse_feeds(feed_urls, api_key, timeout):
    """Fetches feeds and parses them using Google Transit"""
    query_params = {'apikey': api_key} if api_key else {}
    
    feed = gtfs_realtime_pb2.FeedMessage()
    for feed_name, feed_url in feed_urls.items():
        logging.info("Fetching {} from {}".format(feed_name, feed_url))
        try:
            response = requests.get(
                feed_url,
                params=query_params,
                timeout=timeout
            )
            response.raise_for_status()
            
            len_bytes = feed.MergeFromString(response.content)
            logging.info("Successfully fetched {} feed ({} bytes)".format(feed_name, len_bytes))
            
        except requests.exceptions.RequestException as e:
            logging.error("Error fetching {} feed: {}".format(feed_name, e))
        except Exception as e:
            logging.error("Error parsing {} feed: {}".format(feed_name, e))
            
    return feed

def update_static_schedule(static_schedule_url, timeout):
    """Fetches the static schedule and updates the database if needed (future)"""
    logging.info("Static schedule updates not implemented ({})".format(static_schedule_url))
    # TODO
    
def validate_feed_data(feed, validation_options):
    """Validates the feed data based on provided options (future)"""
    logging.info("Data validation not implemented ({})".format(validation_options))
    # TODO
    
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
        logging.error("Database error while storing feed data: {}".format(e))
    except Exception as e:
        logging.error("Unexpected error while storing feed data: {}".format(e))
def main():
    
    # Initialization and setup
    parser, args = parse_arguments()
    setup_logging(args)
    logging.info("Ingest started at {}".format(datetime.now()))
    logging.debug("Parsed arguments: {}".format(args))
    db_connection_string = generate_db_connection_string(args)
    logging.debug("Database connection string: {}".format(db_connection_string))
    
    # Configure and fetch feeds
    if args.static_schedule_url:
        update_static_schedule(args.static_schedule_url, args.timeout)
    feed_urls = collect_feed_urls(args, parser)
    logging.debug("Feed URLs: {}".format(feed_urls))
    
    feed = fetch_and_parse_feeds(feed_urls, args.api_key, args.timeout)
    
    # Post-process
    if args.validation_options:
        validate_feed_data(feed, args.validation_options)
        
    store_feed_data(feed, db_connection_string)

if __name__ == "__main__":
    main()