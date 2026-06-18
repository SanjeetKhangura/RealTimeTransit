import logging
import csv
import io
import zipfile
import requests
from datetime import datetime


def hms_to_seconds(time_str):
    """
    Convert HH:MM:SS format (>24:00:00 ok) to s after midnight
    """
    if not time_str or not time_str.strip():
        return None
    try:
        parts = time_str.split(':')
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = int(parts[2])
        return hours * 3600 + minutes * 60 + seconds
    except (ValueError, IndexError):
        logging.warning("Invalid time format: {}".format(time_str))
        return None


def update_static_schedule(static_schedule_url, timeout):
    """
    Download and parse GTFS static schedule ZIP
    """
    logging.info("Downloading static schedule from {}".format(static_schedule_url))
    
    try:
        response = requests.get(static_schedule_url, timeout=timeout, stream=True)
        response.raise_for_status()
    except requests.RequestException as e:
        logging.exception("Failed to download static schedule: {}".format(e))
        raise
    
    parsed_data = {
        'feed_info': None,
        'calendar': [],
        'calendar_dates': [],
        'stops': [],
        'routes': [],
        'trips': [],
        'stop_times': [],
        'shapes': []
    }
    
    try:
        with zipfile.ZipFile(io.BytesIO(response.content)) as gtfs_zip:
            # feed_info.txt
            if 'feed_info.txt' in gtfs_zip.namelist():
                with gtfs_zip.open('feed_info.txt') as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                    for row in reader:
                        parsed_data['feed_info'] = {
                            'feed_publisher_name': row.get('feed_publisher_name', ''),
                            'feed_publisher_url': row.get('feed_publisher_url', ''),
                            'feed_lang': row.get('feed_lang', 'en'),
                            'default_lang': row.get('default_lang'),
                            'feed_version': row.get('feed_version'),
                            'feed_start_date': row.get('feed_start_date'),
                            'feed_end_date': row.get('feed_end_date'),
                        }
                        break  # one feed_info row
                logging.debug("Parsed feed_info: version={}".format(parsed_data['feed_info'].get('feed_version')))
            else:
                logging.warning("feed_info.txt not found in GTFS feed")
                parsed_data['feed_info'] = {'feed_publisher_name': '', 'feed_publisher_url': '', 'feed_lang': 'en'}
            
            # calendar.txt (service by weekday)
            if 'calendar.txt' in gtfs_zip.namelist():
                with gtfs_zip.open('calendar.txt') as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                    for row in reader:
                        parsed_data['calendar'].append({
                            'service_id': row['service_id'],
                            'monday': int(row.get('monday', 0)),
                            'tuesday': int(row.get('tuesday', 0)),
                            'wednesday': int(row.get('wednesday', 0)),
                            'thursday': int(row.get('thursday', 0)),
                            'friday': int(row.get('friday', 0)),
                            'saturday': int(row.get('saturday', 0)),
                            'sunday': int(row.get('sunday', 0)),
                            'start_date': row['start_date'],
                            'end_date': row['end_date'],
                        })
                logging.debug("Parsed {} calendar records".format(len(parsed_data['calendar'])))
            else:
                logging.warning("calendar.txt not found in GTFS feed")
            
            # calendar_dates.txt (schedule override)
            if 'calendar_dates.txt' in gtfs_zip.namelist():
                with gtfs_zip.open('calendar_dates.txt') as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                    for row in reader:
                        parsed_data['calendar_dates'].append({
                            'service_id': row['service_id'],
                            'date': row['date'],
                            'exception_type': int(row['exception_type']),
                        })
                logging.debug("Parsed {} calendar_dates records".format(len(parsed_data['calendar_dates'])))
            
            # stops.txt
            with gtfs_zip.open('stops.txt') as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                for row in reader:
                    stop_lat = row.get('stop_lat')
                    stop_lon = row.get('stop_lon')
                    
                    # Validate coordinates
                    if stop_lat and stop_lon:
                        lat = float(stop_lat)
                        lon = float(stop_lon)
                        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                            logging.warning("Invalid coordinates for stop {}: lat={}, lon={}".format(row['stop_id'], lat, lon))
                            continue
                    
                    parsed_data['stops'].append({
                        'stop_id': row['stop_id'],
                        'stop_name': row.get('stop_name', ''),
                        'stop_code': row.get('stop_code'),
                        'stop_desc': row.get('stop_desc'),
                        'stop_lat': float(stop_lat) if stop_lat else None,
                        'stop_lon': float(stop_lon) if stop_lon else None,
                        'wheelchair_boarding': row.get('wheelchair_boarding'),
                    })
            logging.debug("Parsed {} stops".format(len(parsed_data['stops'])))
            
            # routes.txt
            with gtfs_zip.open('routes.txt') as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                for row in reader:
                    parsed_data['routes'].append({
                        'route_id': row['route_id'],
                        'route_short_name': row.get('route_short_name'),
                        'route_long_name': row.get('route_long_name'),
                        'route_desc': row.get('route_desc'),
                        'route_type': int(row['route_type']),
                        'route_url': row.get('route_url'),
                        'route_color': row.get('route_color'),
                        'route_text_color': row.get('route_text_color'),
                    })
            logging.debug("Parsed {} routes".format(len(parsed_data['routes'])))
            
            # trips.txt
            with gtfs_zip.open('trips.txt') as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                for row in reader:
                    parsed_data['trips'].append({
                        'trip_id': row['trip_id'],
                        'route_id': row['route_id'],
                        'service_id': row['service_id'],
                        'trip_headsign': row.get('trip_headsign'),
                        'direction_id': int(row['direction_id']) if row.get('direction_id') else None,
                        'shape_id': row.get('shape_id'),
                        'wheelchair_accessible': int(row['wheelchair_accessible']) if row.get('wheelchair_accessible') else None,
                        'bikes_allowed': int(row.get('bikes_allowed')) if row.get('bikes_allowed') else None,
                    })
            logging.debug("Parsed {} trips".format(len(parsed_data['trips'])))
            
            # stop_times.txt
            with gtfs_zip.open('stop_times.txt') as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                stop_count = 0
                for row in reader:
                    parsed_data['stop_times'].append({
                        'trip_id': row['trip_id'],
                        'stop_sequence': int(row['stop_sequence']),
                        'stop_id': row['stop_id'],
                        'arrival_seconds': hms_to_seconds(row.get('arrival_time')),
                        'departure_seconds': hms_to_seconds(row.get('departure_time')),
                        'pickup_type': int(row['pickup_type']) if row.get('pickup_type') else 0,
                        'drop_off_type': int(row.get('drop_off_type', 0)),
                        'shape_dist_traveled': float(row['shape_dist_traveled']) if row.get('shape_dist_traveled') else None,
                    })
                    stop_count += 1
            logging.debug("Parsed {} stop_times".format(stop_count))
            
            # shapes.txt
            if 'shapes.txt' in gtfs_zip.namelist():
                with gtfs_zip.open('shapes.txt') as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                    for row in reader:
                        lat = float(row['shape_pt_lat'])
                        lon = float(row['shape_pt_lon'])
                        
                        # Validate coordinates
                        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                            logging.warning("Invalid coordinates in shape {}: lat={}, lon={}".format(row['shape_id'], lat, lon))
                            continue
                        
                        parsed_data['shapes'].append({
                            'shape_id': row['shape_id'],
                            'shape_pt_sequence': int(row['shape_pt_sequence']),
                            'shape_pt_lat': lat,
                            'shape_pt_lon': lon,
                            'shape_dist_traveled': float(row['shape_dist_traveled']) if row.get('shape_dist_traveled') else None,
                        })
                logging.debug("Parsed {} shape points".format(len(parsed_data['shapes'])))
            else:
                logging.warning("shapes.txt not found in GTFS feed")
    
    except zipfile.BadZipFile as e:
        logging.exception("Invalid ZIP file: {}".format(e))
        raise
    except KeyError as e:
        logging.exception("Missing required GTFS file: {}".format(e))
        raise
    except Exception as e:
        logging.exception("Error parsing GTFS feed: {}".format(e))
        raise
    
    logging.info("Static schedule parsing complete")
    return parsed_data
