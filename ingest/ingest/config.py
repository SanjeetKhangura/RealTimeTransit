import argparse
import logging
import os
from datetime import datetime


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
