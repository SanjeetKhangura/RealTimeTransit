#!/usr/bin/env python3

import logging
from datetime import datetime

from ingest.fetch import fetch_and_parse_feeds
from ingest.config import parse_arguments, setup_logging, generate_db_connection_string, collect_feed_urls
from ingest.to_db import store_feed_data
from ingest.static import update_static_schedule

    
def validate_feed_data(feed, validation_options, schedule):
    """Validates the feed data based on provided options (future)"""
    logging.info("Data validation not implemented ({})".format(validation_options))
    # TODO

def main():
    
    # Initialization and setup
    parser, args = parse_arguments()
    setup_logging(args)
    logging.info("Ingest started at {}".format(datetime.now()))
    logging.debug("Parsed arguments: {}".format(args))
    db_connection_string = generate_db_connection_string(args)
    logging.debug("Database connection string: {}".format(db_connection_string))
    
    # Configure and fetch feeds
    schedule = None
    if args.static_schedule_url:
        schedule = update_static_schedule(args.static_schedule_url, args.timeout)
    feed_urls = collect_feed_urls(args, parser)
    logging.debug("Feed URLs: {}".format(feed_urls))
    
    feed = fetch_and_parse_feeds(feed_urls, args.api_key, args.timeout)
    
    # Post-process
    if args.validation_options:
        validate_feed_data(feed, args.validation_options, schedule)
        
    store_feed_data(feed, db_connection_string, schedule)

if __name__ == "__main__":
    main()