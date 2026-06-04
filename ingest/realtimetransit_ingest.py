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
    """Stores the feed data into the database (future)"""
    logging.info("Data storage not implemented ({})".format(db_connection_string))
    # TODO
    # temp dump to console
    logging.debug("Feed content: {}".format(repr(feed)))

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