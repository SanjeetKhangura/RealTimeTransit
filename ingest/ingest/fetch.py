import logging

import requests
from google.transit import gtfs_realtime_pb2


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
            logging.exception("Error fetching {} feed: {}".format(feed_name, e))
        except Exception as e:
            logging.exception("Error parsing {} feed: {}".format(feed_name, e))

    return feed
