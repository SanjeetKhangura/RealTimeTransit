import logging
import os
import argparse
import requests
from datetime import datetime
from google.transit import gtfs_realtime_pb2

if __name__ == "__main__":
    print("ingest start {}".format(datetime.now()))
    
    # parse args
    parser = argparse.ArgumentParser(description='Ingest GTFS data')
    parser.add_argument(
        '--url', '-u',
        type=str,
        default=os.getenv('FEED_URL', 'https://gtfsapi.translink.ca/v3/gtfsposition'),
        help='url of the feed to ingest'
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
        level=args.log_level,
        handlers=[
            logging.FileHandler(args.log_file),
            logging.StreamHandler()
        ]
    )
    logging.debug("Parsed arguments: {}".format(args))

    # set up timescaledb connection
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

    # fetch feed
    logging.info("Fetching feed from {}".format(args.url))
    feed = gtfs_realtime_pb2.FeedMessage()
    try:
        response = requests.get(
            args.url,
            headers={'Authorization': 'Bearer {}'.format(args.api_key)},
            timeout=args.timeout
        )
        response.raise_for_status()
        feed.ParseFromString(response.content)
        logging.info("Successfully fetched feed with {} entities".format(len(feed.entity)))
    except requests.exceptions.RequestException as e:
        logging.error("Error fetching feed: {}".format(e))
        exit(1)
    except Exception as e:
        logging.error("Error parsing feed: {}".format(e))
        exit(1)

    # todo: validate data for invalid or missing fields (and compare to static schedule)
    
    #//

    # todo: upsert data into timescaledb
