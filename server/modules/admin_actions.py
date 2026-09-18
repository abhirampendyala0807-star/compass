from .demand_calculator import calculate_surge_metrics

# City-specific infrastructure and action templates
CITY_ACTIONS = {
    "tirupati": {
        "HIGH_crowd": [
            "Activate Compartment Queue system at Vaikuntam Queue Complex — split into 6 parallel lanes",
            "Issue real-time crowd advisory to travelers approaching via Alipiri Footpath",
            "Open overflow darshan corridor through Narayanagiri Gardens route"
        ],
        "HIGH_transport": [
            "Increase APSRTC shuttle frequency on Tirupati-Tirumala Ghat Road to 5-min intervals",
            "Open secondary parking lot at Bhudevi Complex and deploy shuttle loop",
            "Activate one-way traffic protocol on Tirumala Ghat Road (uphill only 6AM-2PM)"
        ],
        "HIGH_medical": [
            "Deploy additional medical triage unit at Vaikuntam Queue Complex North Gate",
            "Station 2 additional ambulances at Tirumala Bus Stand with direct route to SVIMS Hospital",
            "Set up hydration and first-aid counter near Hundi Collection Point"
        ]
    },
    "varanasi": {
        "HIGH_crowd": [
            "Activate one-way pedestrian flow on Kashi Vishwanath Corridor (entry via Gate 4, exit via Gate 1)",
            "Deploy crowd marshals at Dashashwamedh Ghat steps during Ganga Aarti (6:30-7:30 PM)",
            "Close vehicular access on Godowlia Chowk from 5 PM onwards"
        ],
        "HIGH_transport": [
            "Increase city bus frequency on Varanasi Junction to Godowlia route",
            "Open temporary boat shuttle service from Assi Ghat to Dashashwamedh Ghat",
            "Activate overflow parking at BHU Ground with e-rickshaw feeder service"
        ],
        "HIGH_medical": [
            "Deploy medical first-responder unit at Dashashwamedh Ghat during Aarti hours",
            "Station ambulance at Lanka Crossing with clear corridor to Heritage Hospital",
            "Set up heat-stroke prevention and hydration kiosk at Manikarnika Ghat approach"
        ]
    },
    "puri": {
        "HIGH_crowd": [
            "Activate barricaded queue corridor from Grand Road to Singhadwara (Lion's Gate)",
            "Deploy volunteer marshals at all 4 temple gates with real-time headcount",
            "Issue crowd density SMS alert to registered devotees approaching via Marine Drive"
        ],
        "HIGH_transport": [
            "Run special Puri-Bhubaneswar express shuttle buses every 15 minutes",
            "Open temporary parking at Balagandi Ground with free shuttle to Grand Road",
            "Activate one-way traffic on Grand Road (temple-bound only 5AM-12PM)"
        ],
        "HIGH_medical": [
            "Deploy medical unit at Singhadwara Gate and Anand Bazaar junction",
            "Station ambulance with direct route clearance to District HQ Hospital (2 km)",
            "Set up sunstroke and dehydration counter near Gundicha Temple for Rath Yatra route"
        ]
    },
    "kedarnath": {
        "HIGH_crowd": [
            "Activate staggered batch departure system at Gaurikund (batches of 200 every 30 min)",
            "Deploy trail marshals at Rambara and Lincholi rest stops for crowd pacing",
            "Limit simultaneous trekkers on trail to 2000 via digital gate-pass system"
        ],
        "HIGH_transport": [
            "Increase helicopter sortie frequency from Phata and Guptkashi helipads",
            "Deploy additional Palki and Kandi carriers at Gaurikund base for elderly pilgrims",
            "Open overflow parking at Sonprayag with mandatory shuttle transfer to Gaurikund"
        ],
        "HIGH_medical": [
            "Activate oxygen supply stations at Rambara (8 km) and Lincholi (11 km) rest points",
            "Station portable medical unit at Kedarnath Base Camp with AMS treatment capability",
            "Deploy search-and-rescue team on standby at Gaurikund helipad"
        ]
    },
    "amritsar": {
        "HIGH_crowd": [
            "Activate crowd flow management at all 4 entry gates of Golden Temple complex",
            "Deploy volunteer seva marshals in Parikrama corridor during peak hours (4-8 AM, 6-9 PM)",
            "Open overflow Langar seating at Guru Ram Das Langar Hall annex"
        ],
        "HIGH_transport": [
            "Increase local bus frequency on Amritsar Junction to Hall Gate route",
            "Open temporary parking at Ram Tirath Road ground with free shuttle to Golden Temple",
            "Activate traffic diversion on GT Road bypass during peak pilgrimage hours"
        ],
        "HIGH_medical": [
            "Deploy first-aid unit at each of the 4 temple entry gates",
            "Station ambulance at Hall Gate with clear corridor to Guru Nanak Dev Hospital",
            "Set up hydration and wheelchair service counter near Jallianwala Bagh entrance"
        ]
    },
    "goa": {
        "HIGH_crowd": [
            "Activate crowd density monitoring on Calangute-Baga beach strip via CCTV analytics",
            "Deploy lifeguard reinforcements at Anjuna, Vagator, and Morjim beaches",
            "Issue beach capacity SMS alerts when Baga Beach exceeds 80% density threshold"
        ],
        "HIGH_transport": [
            "Increase Kadamba bus frequency on Panaji-Calangute-Anjuna coastal route",
            "Deploy temporary taxi marshaling at Mopa/Dabolim airport with surge pricing cap",
            "Open overflow parking at Saligao Grounds with shuttle to Calangute beach"
        ],
        "HIGH_medical": [
            "Deploy mobile medical unit at Tito's Lane junction (peak nightlife zone)",
            "Station ambulance at Calangute Beach lifeguard tower with route to GMC Hospital",
            "Set up water safety and drowning prevention patrol at Baga river mouth"
        ]
    },
    "shirdi": {
        "HIGH_crowd": [
            "Activate compartment darshan queue at Samadhi Mandir — 8 parallel lanes",
            "Deploy crowd marshals at Dwarkamai and Chavadi exit points",
            "Issue real-time queue length updates via Shirdi Sai Sansthan app notifications"
        ],
        "HIGH_transport": [
            "Increase MSRTC bus frequency on Ahmednagar-Shirdi and Nashik-Shirdi routes",
            "Open overflow parking at Sai Prasadalaya grounds with shuttle loop",
            "Deploy additional auto-rickshaw queue at Sainagar Shirdi railway station"
        ],
        "HIGH_medical": [
            "Deploy medical unit at Samadhi Mandir North Gate and Prasadalaya",
            "Station ambulance with route clearance to Sai Sansthan Hospital (1.5 km)",
            "Set up heat-stroke prevention counter in open queue waiting area"
        ]
    },
    "madurai": {
        "HIGH_crowd": [
            "Activate one-way pedestrian flow through East Tower Gate to West Tower exit",
            "Deploy crowd marshals at Golden Lotus Tank and Thousand Pillar Hall",
            "Close vehicular traffic on East Masi Street during peak darshan hours"
        ],
        "HIGH_transport": [
            "Increase city bus frequency from Madurai Junction to Meenakshi Temple stop",
            "Deploy additional auto-rickshaw marshaling at Periyar Bus Stand",
            "Open temporary parking at Vandiyur Mariamman Teppakulam with shuttle service"
        ],
        "HIGH_medical": [
            "Deploy medical triage unit at East Tower Gate entrance",
            "Station ambulance at South Masi Street with route to Meenakshi Mission Hospital",
            "Set up hydration counter in Thousand Pillar Hall during summer months"
        ]
    }
}


def get_city_specific_actions(destination: str, level: str, category: str):
    """Get city-specific actions or fall back to sensible defaults."""
    dest_lower = destination.lower().replace('tirupathi', 'tirupati')
    key = f"{level}_{category}"

    for city_key in CITY_ACTIONS:
        if city_key in dest_lower:
            actions = CITY_ACTIONS[city_key].get(key)
            if actions:
                return actions
            break

    # Sensible fallback actions
    defaults = {
        "HIGH_crowd": [
            f"Deploy crowd management personnel at main venue entry points in {destination}",
            f"Issue real-time crowd density advisory to travelers approaching {destination}",
            "Activate one-way pedestrian corridor in high-density zones"
        ],
        "MEDIUM_crowd": [
            "Enable single-direction pedestrian corridors in busy areas",
            "Monitor entry gate queue lengths with 15-min interval checks"
        ],
        "HIGH_transport": [
            f"Increase public transit frequency on main routes to {destination} venue",
            "Open overflow parking with free shuttle loop to venue",
            "Activate traffic diversions on arterial roads during peak hours"
        ],
        "MEDIUM_transport": [
            "Monitor bus terminal and taxi stand queue lengths",
            "Pre-position additional public transport vehicles at depot"
        ],
        "HIGH_medical": [
            "Deploy additional medical triage staff near venue entry gates",
            "Station emergency ambulance with clear corridor to nearest hospital",
            "Set up hydration and first-aid kiosk at main queue area"
        ],
        "MEDIUM_medical": [
            "Ensure first-aid kits stocked at all venue entry points",
            "Keep emergency ambulance corridor clear on main access road"
        ]
    }

    return defaults.get(key, ["Continue standard monitoring operations"])


def generate_admin_recommendations(
    destination: str = "Tirupati",
    crowd_pressure: str = None,
    transport_demand: str = None,
    medical_demand: str = None,
    active_trips: list = None,
    travel_date=None
):
    """
    City-specific, date-aware admin recommendation engine.
    Uses festival calendar and real infrastructure references.
    """
    from datetime import date as date_type
    if travel_date and isinstance(travel_date, str):
        try:
            travel_date = date_type.fromisoformat(travel_date)
        except ValueError:
            travel_date = None

    surge_data = calculate_surge_metrics(destination, active_trips, travel_date)

    cp = crowd_pressure.upper() if crowd_pressure else surge_data["crowd_pressure"]
    td = transport_demand.upper() if transport_demand else surge_data["transport_demand"]
    md = medical_demand.upper() if medical_demand else surge_data["medical_demand"]

    actions = []

    # Get city-specific actions based on demand levels
    if cp in ["HIGH", "CRITICAL"]:
        actions.extend(get_city_specific_actions(destination, "HIGH", "crowd"))
    elif cp == "MEDIUM":
        actions.extend(get_city_specific_actions(destination, "MEDIUM", "crowd"))

    if td == "HIGH":
        actions.extend(get_city_specific_actions(destination, "HIGH", "transport"))
    elif td == "MEDIUM":
        actions.extend(get_city_specific_actions(destination, "MEDIUM", "transport"))

    if md in ["HIGH", "CRITICAL"]:
        actions.extend(get_city_specific_actions(destination, "HIGH", "medical"))
    elif md == "MEDIUM":
        actions.extend(get_city_specific_actions(destination, "MEDIUM", "medical"))

    if not actions:
        actions.append("Normal operations — continue standard monitoring")

    # Build event name from festival context
    festival_names = surge_data.get("active_festivals", [])
    if festival_names:
        event_name = f"{destination.capitalize()} — {', '.join(festival_names)} Surge"
    else:
        event_name = f"{destination.capitalize()} Crowd Intelligence Report"

    return {
        "event_name": event_name,
        "destination": destination,
        "estimated_demand": surge_data["estimated_visitors_formatted"],
        "metrics": {
            "crowd_pressure": cp,
            "transport_demand": td,
            "medical_demand": md,
        },
        "surge_data": surge_data,
        "area_density": surge_data["area_density"],
        "recommended_actions": actions,
        "surge_reason": surge_data.get("surge_reason", ""),
        "active_festivals": festival_names,
        "travel_date": surge_data.get("travel_date", ""),
        "last_updated": "Live Signals"
    }
