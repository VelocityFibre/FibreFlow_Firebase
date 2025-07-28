#!/usr/bin/env python3
"""
FibreFlow-specific validators for data integrity
Shared utilities for hook scripts
"""

import re
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path

# Validation patterns
POLE_NUMBER_PATTERN = re.compile(r'^[A-Z]{3,4}\.P\.[A-Z]\d{3,4}$')
DROP_NUMBER_PATTERN = re.compile(r'^DR\d{4,6}$')
PROJECT_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')

# Business rules
MAX_DROPS_PER_POLE = 12
REQUIRED_POLE_PHOTOS = ['before', 'front', 'side', 'depth', 'concrete', 'compaction']

# Cached data for performance
_pole_cache = {}
_drop_cache = {}
_cache_timestamp = 0
CACHE_TTL = 300  # 5 minutes


class ValidationResult:
    """Structured validation result"""
    def __init__(self):
        self.valid = True
        self.errors = []
        self.warnings = []
        self.data = {}
    
    def add_error(self, message: str):
        self.valid = False
        self.errors.append(message)
    
    def add_warning(self, message: str):
        self.warnings.append(message)
    
    def to_dict(self) -> Dict:
        return {
            'valid': self.valid,
            'errors': self.errors,
            'warnings': self.warnings,
            'data': self.data
        }


def validate_pole_number(pole_number: str) -> ValidationResult:
    """Validate pole number format and structure"""
    result = ValidationResult()
    
    if not pole_number:
        result.add_error("Pole number is required")
        return result
    
    if not POLE_NUMBER_PATTERN.match(pole_number):
        result.add_error(
            f"Invalid pole number format: {pole_number}. "
            f"Expected: PROJECT.P.LETTER+NUMBERS (e.g., LAW.P.B167)"
        )
        return result
    
    # Extract components
    parts = pole_number.split('.')
    project_code = parts[0]
    pole_id = parts[2]
    
    result.data['project_code'] = project_code
    result.data['pole_id'] = pole_id
    
    # Validate project code length
    if len(project_code) < 3 or len(project_code) > 4:
        result.add_warning(f"Unusual project code length: {project_code}")
    
    return result


def validate_drop_number(drop_number: str) -> ValidationResult:
    """Validate drop number format"""
    result = ValidationResult()
    
    if not drop_number:
        result.add_error("Drop number is required")
        return result
    
    if not DROP_NUMBER_PATTERN.match(drop_number):
        result.add_error(
            f"Invalid drop number format: {drop_number}. "
            f"Expected: DR followed by 4-6 digits (e.g., DR1234)"
        )
    
    return result


def check_pole_capacity(pole_id: str, current_drops: List[str]) -> ValidationResult:
    """Check if pole has capacity for more drops"""
    result = ValidationResult()
    
    if len(current_drops) >= MAX_DROPS_PER_POLE:
        result.add_error(
            f"Pole {pole_id} at maximum capacity ({MAX_DROPS_PER_POLE} drops). "
            f"Current drops: {', '.join(current_drops)}"
        )
    else:
        result.data['current_drops'] = len(current_drops)
        result.data['available_capacity'] = MAX_DROPS_PER_POLE - len(current_drops)
    
    return result


def validate_gps_coordinates(lat: float, lng: float) -> ValidationResult:
    """Validate GPS coordinates are within reasonable bounds"""
    result = ValidationResult()
    
    # South Africa approximate bounds
    SA_BOUNDS = {
        'lat': {'min': -35.0, 'max': -22.0},
        'lng': {'min': 16.0, 'max': 33.0}
    }
    
    if not (-90 <= lat <= 90):
        result.add_error(f"Invalid latitude: {lat}")
    elif not (SA_BOUNDS['lat']['min'] <= lat <= SA_BOUNDS['lat']['max']):
        result.add_warning(f"Latitude {lat} outside South Africa bounds")
    
    if not (-180 <= lng <= 180):
        result.add_error(f"Invalid longitude: {lng}")
    elif not (SA_BOUNDS['lng']['min'] <= lng <= SA_BOUNDS['lng']['max']):
        result.add_warning(f"Longitude {lng} outside South Africa bounds")
    
    return result


def validate_photo_requirements(photos: List[str]) -> ValidationResult:
    """Validate all required photos are present"""
    result = ValidationResult()
    
    missing_photos = []
    for required in REQUIRED_POLE_PHOTOS:
        if required not in photos:
            missing_photos.append(required)
    
    if missing_photos:
        result.add_error(
            f"Missing required photos: {', '.join(missing_photos)}. "
            f"Required: {', '.join(REQUIRED_POLE_PHOTOS)}"
        )
    
    result.data['provided_photos'] = len(photos)
    result.data['required_photos'] = len(REQUIRED_POLE_PHOTOS)
    
    return result


def validate_import_data(data: Dict) -> ValidationResult:
    """Validate data for import operations"""
    result = ValidationResult()
    
    # Check for required fields
    required_fields = ['poleNumber', 'gpsLocation', 'projectId']
    missing_fields = []
    
    for field in required_fields:
        if field not in data or not data[field]:
            missing_fields.append(field)
    
    if missing_fields:
        result.add_error(f"Missing required fields: {', '.join(missing_fields)}")
        return result
    
    # Validate pole number
    pole_result = validate_pole_number(data['poleNumber'])
    if not pole_result.valid:
        for error in pole_result.errors:
            result.add_error(error)
    
    # Validate GPS if provided
    if 'gpsLocation' in data and isinstance(data['gpsLocation'], dict):
        lat = data['gpsLocation'].get('lat', 0)
        lng = data['gpsLocation'].get('lng', 0)
        gps_result = validate_gps_coordinates(lat, lng)
        if not gps_result.valid:
            for error in gps_result.errors:
                result.add_error(error)
        for warning in gps_result.warnings:
            result.add_warning(warning)
    
    # Validate drops if provided
    if 'connectedDrops' in data:
        drops = data.get('connectedDrops', [])
        if len(drops) > MAX_DROPS_PER_POLE:
            result.add_error(
                f"Too many drops ({len(drops)}). Maximum allowed: {MAX_DROPS_PER_POLE}"
            )
        
        for drop in drops:
            drop_result = validate_drop_number(drop)
            if not drop_result.valid:
                for error in drop_result.errors:
                    result.add_error(f"Drop validation: {error}")
    
    return result


def extract_entities_from_content(content: str) -> Dict[str, List[str]]:
    """Extract pole numbers, drop numbers, and other entities from content"""
    entities = {
        'pole_numbers': [],
        'drop_numbers': [],
        'gps_coordinates': [],
        'project_ids': []
    }
    
    # Find pole numbers
    pole_matches = POLE_NUMBER_PATTERN.findall(content)
    entities['pole_numbers'] = list(set(pole_matches))
    
    # Find drop numbers
    drop_matches = DROP_NUMBER_PATTERN.findall(content)
    entities['drop_numbers'] = list(set(drop_matches))
    
    # Find GPS coordinates (simple pattern)
    gps_pattern = re.compile(r'(-?\d+\.?\d*),\s*(-?\d+\.?\d*)')
    gps_matches = gps_pattern.findall(content)
    entities['gps_coordinates'] = [(float(lat), float(lng)) for lat, lng in gps_matches]
    
    # Find project IDs (simplified)
    project_pattern = re.compile(r'projectId["\s:]+([a-zA-Z0-9_-]+)')
    project_matches = project_pattern.findall(content)
    entities['project_ids'] = list(set(project_matches))
    
    return entities


def load_existing_data(data_type: str) -> Dict:
    """Load existing poles/drops from cache or file"""
    global _pole_cache, _drop_cache, _cache_timestamp
    import time
    
    current_time = time.time()
    if current_time - _cache_timestamp > CACHE_TTL:
        # Reload cache
        _pole_cache = {}
        _drop_cache = {}
        _cache_timestamp = current_time
        
        # In a real implementation, this would query Firestore
        # For now, we'll load from a local file if it exists
        cache_file = Path(__file__).parent.parent / 'logs' / 'entity_cache.json'
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
                    _pole_cache = cache_data.get('poles', {})
                    _drop_cache = cache_data.get('drops', {})
            except:
                pass
    
    if data_type == 'poles':
        return _pole_cache
    elif data_type == 'drops':
        return _drop_cache
    else:
        return {}


def check_uniqueness(entity_type: str, entity_id: str) -> Tuple[bool, Optional[str]]:
    """Check if entity already exists"""
    existing_data = load_existing_data(entity_type)
    
    if entity_id in existing_data:
        return False, f"{entity_type[:-1].title()} {entity_id} already exists"
    
    return True, None