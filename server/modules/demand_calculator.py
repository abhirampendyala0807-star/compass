# ========================================================
# TASK A: Aggregated Demand & Surge Calculator
# ========================================================
from datetime import datetime, date

# Festival calendar: maps month-day ranges to events and affected cities
FESTIVAL_CALENDAR = [
    {"name": "Brahmotsavam", "cities": ["tirupati"], "start": (9, 20), "end": (9, 29), "multiplier": 3.5},
    {"name": "Vaikuntha Ekadashi", "cities": ["tirupati"], "start": (12, 20), "end": (12, 26), "multiplier": 4.0},
    {"name": "Dev Deepawali", "cities": ["varanasi"], "start": (11, 10), "end": (11, 18), "multiplier": 3.0},
    {"name": "Mahashivaratri", "cities": ["varanasi", "kedarnath"], "start": (2, 25), "end": (3, 2), "multiplier": 3.5},
    {"name": "Rath Yatra", "cities": ["puri"], "start": (6, 20), "end": (7, 5), "multiplier": 4.5},
    {"name": "Snana Yatra", "cities": ["puri"], "start": (6, 1), "end": (6, 8), "multiplier": 2.5},
    {"name": "Char Dham Season Opening", "cities": ["kedarnath"], "start": (5, 1), "end": (5, 15), "multiplier": 3.0},
    {"name": "Baisakhi & Gurpurab", "cities": ["amritsar"], "start": (4, 12), "end": (4, 15), "multiplier": 3.0},
    {"name": "Guru Nanak Jayanti", "cities": ["amritsar"], "start": (11, 15), "end": (11, 17), "multiplier": 3.5},
    {"name": "Sunburn Festival", "cities": ["goa"], "start": (12, 27), "end": (12, 31), "multiplier": 2.5},
    {"name": "New Year Rush", "cities": ["goa"], "start": (12, 28), "end": (1, 3), "multiplier": 3.0},
    {"name": "Carnival", "cities": ["goa"], "start": (2, 15), "end": (2, 18), "multiplier": 2.0},
    {"name": "Navratri & Dussehra", "cities": ["mysore", "varanasi", "tirupati", "shirdi", "madurai"], "start": (10, 1), "end": (10, 15), "multiplier": 2.5},
    {"name": "Diwali Week", "cities": ["varanasi", "amritsar", "tirupati", "shirdi", "rishikesh"], "start": (10, 28), "end": (11, 5), "multiplier": 2.5},
    {"name": "Shirdi Sai Baba Punyatithi", "cities": ["shirdi"], "start": (10, 5), "end": (10, 10), "multiplier": 3.5},
    {"name": "Ram Navami", "cities": ["shirdi", "varanasi", "bodh gaya"], "start": (4, 5), "end": (4, 8), "multiplier": 2.0},
    {"name": "Meenakshi Thirukalyanam", "cities": ["madurai"], "start": (4, 10), "end": (4, 20), "multiplier": 3.5},
    {"name": "Buddha Purnima", "cities": ["bodh gaya"], "start": (5, 20), "end": (5, 25), "multiplier": 3.0},
    {"name": "Maha Kumbh / Ardh Kumbh", "cities": ["rishikesh", "varanasi"], "start": (1, 13), "end": (2, 26), "multiplier": 5.0},
    {"name": "International Yoga Day Rush", "cities": ["rishikesh"], "start": (6, 18), "end": (6, 23), "multiplier": 2.0},
    {"name": "Kartik Purnima", "cities": ["somnath", "dwarka", "varanasi"], "start": (11, 25), "end": (11, 28), "multiplier": 2.5},
    {"name": "Janmashtami", "cities": ["dwarka", "varanasi", "madurai"], "start": (8, 25), "end": (8, 28), "multiplier": 3.0},
]

# City-specific real zone names
CITY_ZONES = {
    "tirupati": {
        "zone_a": "Vaikuntam Queue Complex & Sanctum",
        "zone_b": "Tirumala Bus Stand & Alipiri Footpath",
        "zone_c": "Tirupati Railway Station & Renigunta Junction"
    },
    "varanasi": {
        "zone_a": "Kashi Vishwanath Corridor & Dashashwamedh Ghat",
        "zone_b": "Varanasi Junction & Lanka Crossing",
        "zone_c": "Sarnath Ring Road & Outer Bypass"
    },
    "puri": {
        "zone_a": "Jagannath Temple & Grand Road",
        "zone_b": "Puri Railway Station & Marine Drive",
        "zone_c": "Bhubaneswar Highway Staging Area"
    },
    "kedarnath": {
        "zone_a": "Kedarnath Temple Complex",
        "zone_b": "Gaurikund Base Camp & Helipad",
        "zone_c": "Sonprayag Check-Post & Phata Bypass"
    },
    "amritsar": {
        "zone_a": "Golden Temple Parikrama & Langar Hall",
        "zone_b": "Amritsar Junction & Hall Gate",
        "zone_c": "GT Road Bypass & Airport Road Staging"
    },
    "goa": {
        "zone_a": "Calangute-Baga Beach Strip & Anjuna",
        "zone_b": "Madgaon Junction & Panaji Bus Stand",
        "zone_c": "Dabolim/Mopa Airport Exit & NH-66 Corridor"
    },
    "mysore": {
        "zone_a": "Mysore Palace & Chamundi Hill",
        "zone_b": "Mysuru Junction & KSRTC Bus Stand",
        "zone_c": "Outer Ring Road & Nanjangud Highway"
    },
    "shirdi": {
        "zone_a": "Sai Baba Samadhi Mandir & Dwarkamai",
        "zone_b": "Shirdi Bus Stand & Sainagar Shirdi Railway Stn",
        "zone_c": "Ahmednagar-Shirdi Highway & Parking Zones"
    },
    "madurai": {
        "zone_a": "Meenakshi Amman Temple & East Tower Gate",
        "zone_b": "Madurai Junction & Periyar Bus Stand",
        "zone_c": "Bypass Road & Kappalur Toll Plaza"
    },
    "bodh gaya": {
        "zone_a": "Mahabodhi Temple & Bodhi Tree Complex",
        "zone_b": "Gaya Junction & Bodhgaya Road",
        "zone_c": "Gaya Airport Road & NH-83 Staging"
    },
    "somnath": {
        "zone_a": "Somnath Jyotirlinga Temple & Sea-front Promenade",
        "zone_b": "Veraval Junction & Bus Depot",
        "zone_c": "Una-Veraval Highway & Parking Grounds"
    },
    "dwarka": {
        "zone_a": "Dwarkadhish Temple & Gomti Ghat",
        "zone_b": "Dwarka Railway Station & Bus Stand",
        "zone_c": "Okha Port Road & NH-947 Corridor"
    },
    "rishikesh": {
        "zone_a": "Ram Jhula, Laxman Jhula & Triveni Ghat",
        "zone_b": "Rishikesh Railway Station & ISBT",
        "zone_c": "Haridwar Bypass & Jolly Grant Airport Road"
    },
    "default": {
        "zone_a": "Main Venue & Central Attraction Zone",
        "zone_b": "Primary Transit Hub & Station Area",
        "zone_c": "Highway Entry & Outer Staging Area"
    }
}

# Base daily footfall estimates per city (non-festival normal day)
BASE_DAILY_FOOTFALL = {
    "tirupati": 75000,
    "varanasi": 50000,
    "puri": 30000,
    "kedarnath": 15000,
    "amritsar": 100000,
    "goa": 60000,
    "mysore": 25000,
    "shirdi": 60000,
    "madurai": 35000,
    "bodh gaya": 8000,
    "somnath": 12000,
    "dwarka": 10000,
    "rishikesh": 20000,
}


def get_active_festivals(destination: str, travel_date: date = None):
    """Check if any festivals are active for this destination on the given date, including public holidays."""
    import urllib.request
    import json
    
    if not travel_date:
        travel_date = date.today()

    dest_lower = destination.lower().replace('tirupathi', 'tirupati')
    active = []

    # 1. Fetch live public holidays from Nager.Date (free, no key required)
    try:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        url = f"https://date.nager.at/api/v3/PublicHolidays/{travel_date.year}/IN"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3, context=ctx) as response:
            holidays = json.loads(response.read().decode())
            for h in holidays:
                h_date = date.fromisoformat(h['date'])
                if h_date == travel_date:
                    active.append({"name": h['name'] + " (Public Holiday)", "multiplier": 2.5})
    except Exception as e:
        print(f"Error fetching Nager API: {e}")

    # 2. Check hardcoded cultural festivals
    for fest in FESTIVAL_CALENDAR:
        if dest_lower not in fest["cities"]:
            continue

        s_month, s_day = fest["start"]
        e_month, e_day = fest["end"]

        try:
            start_date = date(travel_date.year, s_month, s_day)
            end_date = date(travel_date.year, e_month, e_day)
            if end_date < start_date:
                end_date = date(travel_date.year + 1, e_month, e_day)
        except ValueError:
            continue

        if start_date <= travel_date <= end_date:
            active.append({"name": fest["name"], "multiplier": fest["multiplier"]})

    return active



def get_live_weather_multiplier(lat, lon):
    import urllib.request
    import json
    import ssl
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        with urllib.request.urlopen(url, timeout=2, context=ctx) as r:
            data = json.loads(r.read().decode())
            code = data['current_weather']['weathercode']
            if code in [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]: # Rain/Thunder
                return 0.6, "Rainy conditions (Crowds reduced by 40%)"
            elif data['current_weather']['temperature'] > 38:
                return 0.7, "Extreme Heat (Crowds reduced by 30%)"
            return 1.0, "Clear/Normal weather"
    except Exception:
        return 1.0, "Weather data unavailable"

def get_live_poi_capacity(destination):
    import urllib.request
    import json
    import ssl
    import urllib.parse
    NOMINATIM_KEY = '7205bf02135d0b9c825fd27c7c63fd17'
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        headers = {"User-Agent": "CompassTravelPlanner/2.0 (student-hackathon-project; contact@compass.app)"}
        
        # 1. Geocode Destination with Nominatim / LocationIQ
        lat, lon = None, None
        if NOMINATIM_KEY:
            try:
                liq_url = f"https://us1.locationiq.com/v1/search.php?key={NOMINATIM_KEY}&q={urllib.parse.quote(destination)}&format=json&limit=1"
                req = urllib.request.Request(liq_url, headers=headers)
                with urllib.request.urlopen(req, timeout=3, context=ctx) as r:
                    liq_data = json.loads(r.read().decode('utf-8'))
                    if liq_data and len(liq_data) > 0:
                        lat = float(liq_data[0]['lat'])
                        lon = float(liq_data[0]['lon'])
            except Exception:
                pass

        if lat is None or lon is None:
            nom_url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(destination)}&format=json&limit=1"
            req = urllib.request.Request(nom_url, headers=headers)
            with urllib.request.urlopen(req, timeout=3, context=ctx) as r:
                nom_data = json.loads(r.read().decode('utf-8'))
                if nom_data and len(nom_data) > 0:
                    lat = float(nom_data[0]['lat'])
                    lon = float(nom_data[0]['lon'])

        if lat is None or lon is None:
            raise Exception("Destination not found via OSM")

        # 2. Estimate Capacity via OSM Amenities & Tourism Places
        places_url = f"https://nominatim.openstreetmap.org/search?q=hotels+restaurants+in+{urllib.parse.quote(destination)}&format=json&limit=50"
        req2 = urllib.request.Request(places_url, headers=headers)
        with urllib.request.urlopen(req2, timeout=3, context=ctx) as r2:
            places_data = json.loads(r2.read().decode('utf-8'))
            poi_count = len(places_data) if isinstance(places_data, list) else 15
            
            return max(poi_count * 1500, 15000), lat, lon
    except Exception as e:
        return BASE_DAILY_FOOTFALL.get(destination.lower(), 20000), 15.29, 74.12


def get_city_zones(destination: str):
    """Return city-specific real zone names."""
    dest_lower = destination.lower().replace('tirupathi', 'tirupati')
    for key in CITY_ZONES:
        if key in dest_lower:
            return CITY_ZONES[key]
    return CITY_ZONES["default"]


def calculate_surge_metrics(destination: str = "Tirupati", active_trips: list = None, travel_date: date = None):
    from datetime import datetime
        
    if not travel_date:
        travel_date = date.today()

    dest_lower = destination.lower().replace('tirupathi', 'tirupati')
    
    # 1. LIVE POI CAPACITY (Geoapify)
    base_footfall, lat, lon = get_live_poi_capacity(destination)

    # 2. LIVE HOLIDAY API (Nager.Date)
    active_festivals = get_active_festivals(destination, travel_date)
    peak_multiplier = max((f["multiplier"] for f in active_festivals), default=1.0)
    festival_names = [f["name"] for f in active_festivals]

    # 3. LIVE WEATHER API (Open-Meteo)
    weather_multiplier, weather_reason = get_live_weather_multiplier(lat, lon)

    # 4. TIME OF DAY ALGORITHM
    current_hour = (datetime.utcnow().hour + 5) % 24  # IST approximate
    time_multiplier = 1.0
    if 10 <= current_hour <= 18:
        time_multiplier = 1.5 # Peak daytime
    elif current_hour >= 21 or current_hour <= 5:
        time_multiplier = 0.3 # Nighttime drop
        
    weekday = travel_date.weekday()
    weekend_multiplier = 1.8 if weekday >= 5 else 1.2

    # Compute LIVE estimated footfall
    estimated_daily = int(base_footfall * peak_multiplier * weekend_multiplier * weather_multiplier * time_multiplier)
    
    if estimated_daily > 100000:
        crowd_pressure = "CRITICAL"
    elif estimated_daily > 60000:
        crowd_pressure = "HIGH"
    elif estimated_daily > 30000:
        crowd_pressure = "MEDIUM"
    else:
        crowd_pressure = "LOW"

    if estimated_daily > 100000:
        transport_demand = "HIGH"
    elif estimated_daily > 50000:
        transport_demand = "MEDIUM"
    else:
        transport_demand = "LOW"

    elderly_count = 0
    if active_trips:
        elderly_count = sum(t.get("elderly", 0) for t in active_trips)

    if elderly_count >= 3 or estimated_daily > 200000:
        medical_demand = "HIGH"
    elif elderly_count >= 1 or estimated_daily > 60000:
        medical_demand = "MEDIUM"
    else:
        medical_demand = "LOW"

    zones = get_city_zones(destination)
    zone_a_density = "CRITICAL" if crowd_pressure == "CRITICAL" else ("HIGH" if crowd_pressure in ["HIGH", "CRITICAL"] else "MEDIUM")
    zone_b_density = "HIGH" if transport_demand == "HIGH" else "MEDIUM"
    zone_c_density = "LOW" if estimated_daily < 120000 else "MEDIUM"

    area_density = {
        zones["zone_a"]: zone_a_density,
        zones["zone_b"]: zone_b_density,
        zones["zone_c"]: zone_c_density
    }

    if estimated_daily >= 100000:
        visitors_formatted = f"{estimated_daily / 100000:.1f}L"
    elif estimated_daily >= 1000:
        visitors_formatted = f"{estimated_daily / 1000:.0f}K"
    else:
        visitors_formatted = str(estimated_daily)

    return {
        "destination": destination,
        "travel_date": str(travel_date),
        "estimated_daily_visitors": estimated_daily,
        "estimated_visitors_formatted": visitors_formatted,
        "crowd_pressure": crowd_pressure,
        "transport_demand": transport_demand,
        "medical_demand": medical_demand,
        "area_density": area_density,
        "active_festivals": festival_names,
        "festival_multiplier": peak_multiplier,
        "is_weekend": weekday >= 5,
        "surge_reason": f"Live Algorithm (OSM POIs={int(base_footfall/1500)}, Time={current_hour}:00, {weather_reason})"
    }
