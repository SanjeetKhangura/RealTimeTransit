#!/usr/bin/env python3

import logging
import os
import argparse
import requests
import psycopg
from datetime import datetime
from google.transit import gtfs_realtime_pb2

if __name__ == "__main__":
    print("ingest start {}".format(datetime.now()))
    
    # parse args
    parser = argparse.ArgumentParser(description='Ingest GTFS data')

    # parser.add_argument(
    #     '--url', '-u',
    #     type=str,
    #     default=os.getenv('FEED_URL', 'https://gtfsapi.translink.ca/v3/gtfsposition'),
    #     help='url of the feed to ingest'
    # )
    parser.add_argument(
        '--gtfs_base_url', '-u',
        type=str,
        default=os.getenv('GTFS_BASE_URL', 'https://gtfsapi.translink.ca/v3/'),
        help='base url of the gtfs feed (including trailing slash)'
    )
    parser.add_argument(
        '--gtfs_endpoint_trip_updates', '-T',
        type=str,
        default=os.getenv('GTFS_ENDPOINT_TRIP_UPDATES', 'gtfsrealtime'),
        help='endpoint for trip updates feed (appended to base url)'
    )
    parser.add_argument(
        '--gtfs_endpoint_vehicle_positions', '-V',
        type=str,
        default=os.getenv('GTFS_ENDPOINT_VEHICLE_POSITIONS', 'gtfsposition'),
        help='endpoint for vehicle positions feed (appended to base url)'
    )
    parser.add_argument(
        '--gtfs_endpoint_service_alerts', '-A',
        type=str,
        default=os.getenv('GTFS_ENDPOINT_SERVICE_ALERTS', 'gtfsalerts'),
        help='endpoint for service alerts feed (appended to base url)'
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
        help='url of the static schedule feed to compare against, if schedule validation is enabled'
    )


    parser.add_argument(
        '--api_key', '-k',
        type=str,
        default=os.getenv('API_KEY', ''),
        help='api key for gtfs feed'
    )
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
    args = parser.parse_args()

    # set up logging
    logging.basicConfig(
        level=(logging.DEBUG if args.verbose else getattr(logging, args.log_level.upper(), logging.INFO)),
        handlers=[
            logging.FileHandler(args.log_file),
            logging.StreamHandler()
        ]
    )
    logging.debug("Parsed arguments: {}".format(args))

    # figure out up postgres connection string
    if args.db:
        db_connection_string = args.db
    else:
        db_connection_string = "postgresql://{}:{}@{}:{}/{}".format(
            args.db_user,
            args.db_password,
            args.db_host,
            args.db_port,
            args.db_name
        )
    logging.debug("Database connection string: {}".format(db_connection_string))

    # set up feed urls if set
    feed_urls = {}
    if args.gtfs_endpoint_trip_updates:
        feed_urls['trip_updates'] = args.gtfs_base_url + args.gtfs_endpoint_trip_updates
    if args.gtfs_endpoint_vehicle_positions:
        feed_urls['vehicle_positions'] = args.gtfs_base_url + args.gtfs_endpoint_vehicle_positions
    if args.gtfs_endpoint_service_alerts:
        feed_urls['service_alerts'] = args.gtfs_base_url + args.gtfs_endpoint_service_alerts
    logging.debug("Feed URLs: {}".format(feed_urls))
    query_params = {'apikey': args.api_key} if args.api_key else {} # python syntax is stupid (why does "if" come after???)
    
    feed = gtfs_realtime_pb2.FeedMessage()
    for feed_name, feed_url in feed_urls.items():
        logging.info("Fetching {} from {}".format(feed_name, feed_url))
        try:
            response = requests.get(
                feed_url,
                params=query_params,
                timeout=args.timeout
            )
            response.raise_for_status()
            lazybadvar = len(feed.entity) #bad bad
            feed.ParseFromString(response.content)
            logging.info("Successfully fetched {} feed with {} entities".format(feed_name, len(feed.entity)-lazybadvar))
        except requests.exceptions.RequestException as e:
            logging.error("Error fetching {} feed: {}".format(feed_name, e))
        except Exception as e:
            logging.error("Error parsing {} feed: {}".format(feed_name, e))

    # todo: validate data for invalid or missing fields (and compare to static schedule)
    
    if (args.validation_options):
        logging.warn("not implemented ({})".format(args.validation_options))
    
    # temp dump to console
    logging.debug("Feed content: {}".format(repr(feed)))

    # todo: copy data into timescaledb

    #with psycopg.connect(db_connection_string) as conn:
