# ========================================================
# PAIR 3 — TASK 2: Context Detector & Pilgrimage Overlay
# ========================================================
from datetime import datetime

PILGRIMAGE_DATABASE = {
    "tirupati": {
        "temple_name": "Venkateswara Temple (Tirumala)",
        "darshan_timings": "03:00 AM - 11:30 PM",
        "dress_code": "Traditional attire mandatory (Dhoti/Kurta for men, Saree/Chudidhar for women)",
        "elderly_friendly": "High — Battery buggies & priority senior citizen queues active at Counter 4",
        "special_entry_pass": "Rs.300 Special Entry Darshan (Advance booking recommended)",
        "portal_url": "https://tirupatibalaji.ap.gov.in",
        "queue_wait_base": {"special_pass": 45, "general_line": 210},
        "protocol_checklist": [
            "Traditional attire (Dhoti/Kurta or Saree/Chudidhar)",
            "Leather belts, wallets & electronics stored in hotel locker",
            "Footwear deposited at free counter near Vaikuntam Queue Complex"
        ],
        "crowd_status": "HIGH",
        "nearest_medical": "Sri Venkateswara Institute of Medical Sciences (4.2 km)",
        "emergency_hotline": "1800-425-4141 (TTD Toll Free)"
    },
    "varanasi": {
        "temple_name": "Kashi Vishwanath Temple & Ganga Ghats",
        "darshan_timings": "03:00 AM - 11:00 PM (Ganga Aarti at 06:45 PM)",
        "dress_code": "Modest traditional clothing required for temple entry",
        "elderly_friendly": "Medium — E-rickshaws to Ghat entrance; boat access for elderly",
        "special_entry_pass": "Sugam Darshan Pass (Fast-track priority queue)",
        "portal_url": "https://shrikashivishwanath.org",
        "queue_wait_base": {"special_pass": 30, "general_line": 120},
        "protocol_checklist": [
            "Modest clothing covering shoulders and knees",
            "Mobile phones deposited at Mandir Security locker",
            "Ganga Aarti boat booked for 06:00 PM"
        ],
        "crowd_status": "MEDIUM",
        "nearest_medical": "Heritage Hospital Varanasi (3.1 km)",
        "emergency_hotline": "112 / Kashi Temple Helpline"
    },
    "puri": {
        "temple_name": "Jagannath Temple Puri",
        "darshan_timings": "05:00 AM - 11:00 PM",
        "dress_code": "Traditional Indian clothing; non-Hindus allowed at Raghunath Library view point",
        "elderly_friendly": "Medium — Battery vehicles from Grand Road parking to Lion's Gate",
        "special_entry_pass": "Paramanik Darshan / Free General Queue",
        "portal_url": "https://shreesanjagannatha.in",
        "queue_wait_base": {"special_pass": 40, "general_line": 150},
        "protocol_checklist": [
            "Traditional Indian attire",
            "No leather items or electronic gadgets inside Singhadwara",
            "Senior citizen assistance requested at Singhadwara Gate"
        ],
        "crowd_status": "HIGH",
        "nearest_medical": "District Headquarter Hospital Puri (2.0 km)",
        "emergency_hotline": "06752-222001 (Puri Helpline)"
    },
    "kedarnath": {
        "temple_name": "Kedarnath Dham Temple",
        "darshan_timings": "04:00 AM - 09:00 PM (Temple closes during winter)",
        "dress_code": "Heavy woolen thermal clothing & sturdy trekking footwear mandatory",
        "elderly_friendly": "Special — Helicopter service from Phata/Gaurikund + Palki/Kandi available",
        "special_entry_pass": "Biometric Mandatory Yatra Registration Card",
        "portal_url": "https://badrinath-kedarnath.gov.in",
        "queue_wait_base": {"special_pass": 25, "general_line": 90},
        "protocol_checklist": [
            "Mandatory Yatra Biometric Registration Card downloaded",
            "Helicopter or Palki pass confirmed for senior citizens",
            "Portable oxygen cylinder and thermal gear packed"
        ],
        "crowd_status": "HIGH",
        "nearest_medical": "Base Medical Aid Center Gaurikund (16 km trek)",
        "emergency_hotline": "108 Emergency Ambulance / Yatra Helpdesk"
    },
    "amritsar": {
        "temple_name": "Sri Harmandir Sahib (Golden Temple)",
        "darshan_timings": "Open 24 Hours",
        "dress_code": "Head covering mandatory for all; footwear removed at entrance wash pool",
        "elderly_friendly": "High — Wheelchairs and volunteers available 24/7 at all entry gates",
        "special_entry_pass": "Free Entry for all visitors",
        "portal_url": "https://sgpc.net",
        "queue_wait_base": {"special_pass": 0, "general_line": 45},
        "protocol_checklist": [
            "Head scarf / rumal tied before entering complex",
            "Wash feet in holy water pool at entrance step",
            "Langar (Community Kitchen) timing verified"
        ],
        "crowd_status": "MEDIUM",
        "nearest_medical": "Guru Nanak Dev Hospital Amritsar (2.5 km)",
        "emergency_hotline": "0183-2553957 (SGPC Helpline)"
    },
    "shirdi": {
        "temple_name": "Shri Sai Baba Samadhi Mandir",
        "darshan_timings": "04:00 AM - 10:30 PM (Kakad Aarti at 04:30 AM)",
        "dress_code": "Modest clothing; avoid shorts and sleeveless tops",
        "elderly_friendly": "High — Wheelchair service & separate senior citizen queue at Gate 2",
        "special_entry_pass": "Free Darshan; VIP Darshan via Sai Sansthan Online Booking",
        "portal_url": "https://online.sai.org.in",
        "queue_wait_base": {"special_pass": 20, "general_line": 120},
        "protocol_checklist": [
            "Mobile phones deposited at digital locker counter",
            "Prasad coupon collected from Prasadalaya counter",
            "Bag storage at free cloakroom near Gate 1"
        ],
        "crowd_status": "HIGH",
        "nearest_medical": "Sai Sansthan Hospital (1.5 km)",
        "emergency_hotline": "02423-258500 (Sai Sansthan Helpline)"
    },
    "madurai": {
        "temple_name": "Meenakshi Amman Temple",
        "darshan_timings": "05:00 AM - 12:30 PM, 04:00 PM - 10:00 PM",
        "dress_code": "Traditional attire; men must remove shirts inside sanctum",
        "elderly_friendly": "Medium — Wheelchair access via East Tower ramp; volunteer assistance",
        "special_entry_pass": "Rs.50 Special Darshan Pass (Counter near East Tower)",
        "portal_url": "https://maduraimeenakshi.org",
        "queue_wait_base": {"special_pass": 15, "general_line": 60},
        "protocol_checklist": [
            "Footwear deposited at paid counter near East Tower Gate",
            "Photography prohibited inside sanctum sanctorum",
            "Golden Lotus Tank visit included in Parikrama route"
        ],
        "crowd_status": "MEDIUM",
        "nearest_medical": "Meenakshi Mission Hospital (2.8 km)",
        "emergency_hotline": "0452-2531961 (Temple Office)"
    },
    "bodh gaya": {
        "temple_name": "Mahabodhi Temple (UNESCO World Heritage)",
        "darshan_timings": "05:00 AM - 09:00 PM",
        "dress_code": "Modest clothing; shoes removed at temple entrance",
        "elderly_friendly": "Medium — Flat terrain; wheelchair accessible main path to Bodhi Tree",
        "special_entry_pass": "Free Entry; Meditation Hall pass at reception",
        "portal_url": "https://bodhgayatemple.com",
        "queue_wait_base": {"special_pass": 0, "general_line": 30},
        "protocol_checklist": [
            "Silence observed in inner meditation zone",
            "Photography allowed in outer complex only",
            "Meditation session booking at reception counter"
        ],
        "crowd_status": "LOW",
        "nearest_medical": "Magadh Medical College Hospital, Gaya (12 km)",
        "emergency_hotline": "0631-2200022 (Gaya District Helpline)"
    },
    "somnath": {
        "temple_name": "Somnath Jyotirlinga Temple",
        "darshan_timings": "06:00 AM - 09:30 PM (Sound & Light Show at 08:00 PM)",
        "dress_code": "Traditional attire recommended; footwear removed at entrance",
        "elderly_friendly": "High — Flat ramp access to main mandapam; wheelchair available",
        "special_entry_pass": "Free Entry; Sound & Light Show ticket Rs.25",
        "portal_url": "https://somnath.org",
        "queue_wait_base": {"special_pass": 10, "general_line": 40},
        "protocol_checklist": [
            "Electronic items deposited at locker counter",
            "Sea-front Promenade walk after evening aarti",
            "Sound & Light Show seating opens at 07:30 PM"
        ],
        "crowd_status": "MEDIUM",
        "nearest_medical": "Somnath Trust Hospital (1 km)",
        "emergency_hotline": "02876-231268 (Somnath Trust)"
    },
    "dwarka": {
        "temple_name": "Dwarkadhish Temple",
        "darshan_timings": "06:30 AM - 01:00 PM, 05:00 PM - 09:30 PM",
        "dress_code": "Traditional attire; head covering for women recommended",
        "elderly_friendly": "Medium — Step-free access via South Gate; volunteer support",
        "special_entry_pass": "Free Entry",
        "portal_url": "https://dwarkadhish.org",
        "queue_wait_base": {"special_pass": 10, "general_line": 35},
        "protocol_checklist": [
            "Footwear and bags at cloakroom near main gate",
            "Gomti Ghat darshan included in temple visit",
            "Bet Dwarka boat service from Okha Jetty (30 min ride)"
        ],
        "crowd_status": "LOW",
        "nearest_medical": "Dwarka General Hospital (1.5 km)",
        "emergency_hotline": "02892-234060 (Dwarka Municipality)"
    },
    "rishikesh": {
        "temple_name": "Triveni Ghat, Ram Jhula & Laxman Jhula Complex",
        "darshan_timings": "Open all day (Ganga Aarti at Triveni Ghat 06:00 PM)",
        "dress_code": "Modest clothing for ashram entry; full coverage for yoga sessions",
        "elderly_friendly": "Low — Steep ghats and suspension bridges; avoid Laxman Jhula for elderly",
        "special_entry_pass": "Free Entry; Ashram stay booking via individual ashram portals",
        "portal_url": "https://uttarakhandtourism.gov.in",
        "queue_wait_base": {"special_pass": 0, "general_line": 20},
        "protocol_checklist": [
            "Alcohol and non-vegetarian food prohibited in Rishikesh city",
            "Rafting permit pre-booked via registered operator",
            "Yoga session booking confirmed at Parmarth Niketan / Sivananda Ashram"
        ],
        "crowd_status": "MEDIUM",
        "nearest_medical": "AIIMS Rishikesh (8 km)",
        "emergency_hotline": "0135-2430763 (Rishikesh Municipality)"
    }
}


# Time-of-day queue multipliers (hour -> factor)
QUEUE_TIME_FACTORS = {
    3: 0.3, 4: 0.4, 5: 0.5, 6: 0.7, 7: 0.8, 8: 0.9,
    9: 1.0, 10: 1.3, 11: 1.5, 12: 1.4, 13: 1.1, 14: 0.9,
    15: 0.8, 16: 0.9, 17: 1.1, 18: 1.3, 19: 1.2, 20: 0.8,
    21: 0.5, 22: 0.3, 23: 0.2, 0: 0.1, 1: 0.1, 2: 0.2
}


def compute_live_queue_wait(base_wait_mins: int, current_hour: int = None):
    """Compute queue wait time that varies by time of day."""
    if current_hour is None:
        current_hour = datetime.now().hour

    factor = QUEUE_TIME_FACTORS.get(current_hour, 1.0)
    adjusted = int(base_wait_mins * factor)

    if adjusted >= 60:
        hours = adjusted / 60
        return f"{hours:.1f} hrs"
    else:
        return f"{adjusted} mins"


def detect_trip_context(destination: str, preferences: list = None, elderly_count: int = 0):
    """
    Detects trip context (vacation, pilgrimage, adventure, family)
    and attaches specialized overlays for pilgrimage destinations.
    Queue wait times vary by current time of day.
    """
    if not preferences:
        preferences = []

    dest_key = destination.lower().strip()

    # Try matching against all keys (handle partial matches like "bodh gaya" vs "bodh")
    pilgrimage_info = None
    matched_key = None
    for key in PILGRIMAGE_DATABASE:
        if key in dest_key or dest_key in key:
            pilgrimage_info = PILGRIMAGE_DATABASE[key]
            matched_key = key
            break

    is_pilgrimage_site = pilgrimage_info is not None or "religious" in [p.lower() for p in preferences]
    is_adventure_site = any(p.lower() in ["adventure", "trekking", "water_sports"] for p in preferences)

    contexts = []
    if is_pilgrimage_site:
        contexts.append("pilgrimage")
    if is_adventure_site:
        contexts.append("adventure")
    if elderly_count > 0:
        contexts.append("senior_assisted")
    if not contexts:
        contexts.append("vacation")

    # Generic pilgrimage fallback if site is not pre-indexed but user selected religious preference
    if is_pilgrimage_site and not pilgrimage_info:
        pilgrimage_info = {
            "temple_name": f"Prominent Spiritual Center in {destination.capitalize()}",
            "darshan_timings": "06:00 AM - 08:30 PM",
            "dress_code": "Modest traditional clothing recommended",
            "elderly_friendly": "Medium — Local transport available",
            "special_entry_pass": "Check official trust portal for advance passes",
            "portal_url": "https://tourism.gov.in",
            "queue_wait_base": {"special_pass": 30, "general_line": 90},
            "protocol_checklist": [
                "Traditional attire recommended",
                "Store luggage at official cloakroom",
                "Verify morning & evening ritual timings"
            ],
            "crowd_status": "MEDIUM",
            "nearest_medical": "Local District Hospital",
            "emergency_hotline": "112 National Emergency"
        }

    # Compute time-of-day adjusted queue waits
    if pilgrimage_info and "queue_wait_base" in pilgrimage_info:
        current_hour = datetime.now().hour
        base = pilgrimage_info["queue_wait_base"]
        pilgrimage_info = dict(pilgrimage_info)  # don't mutate original
        pilgrimage_info["queue_wait"] = {
            "special_pass": compute_live_queue_wait(base["special_pass"], current_hour),
            "general_line": compute_live_queue_wait(base["general_line"], current_hour)
        }
        # Remove internal field from response
        del pilgrimage_info["queue_wait_base"]

    return {
        "destination": destination.capitalize(),
        "active_contexts": contexts,
        "is_pilgrimage": is_pilgrimage_site,
        "has_elderly": elderly_count > 0,
        "pilgrimage_overlay": pilgrimage_info
    }
