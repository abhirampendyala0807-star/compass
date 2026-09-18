import json
from sqlalchemy.orm import Session
from ..models import CuratedTrails

VERIFIED_SEED_TRAILS = [
    {
        "destination_name": "Tirupati",
        "curator_name": "T.V. Ramanathan",
        "curator_role": "TTD Registered Heritage Guide (22 yrs exp)",
        "curator_rating": 4.9,
        "theme": "Sacred Hilltops & Ancient Shrines",
        "zone": "Tirumala Hills Circuit",
        "day_number": 1,
        "total_km": 28.5,
        "total_transit_min": 65,
        "items": [
            {
                "time": "06:30 AM",
                "activity": "Venkateswara Swamy Temple Darshan",
                "desc": "Sacred morning darshan at the main sanctum sanctorum on the Seven Hills.",
                "duration": "2.5 hrs",
                "lat": 13.6833,
                "lng": 79.3472,
                "local_tip": "Carry your physical Aadhaar card and slip. Footwear must be deposited at CRO counters.",
                "best_time_to_visit": "Early morning 6 AM - 8 AM to beat pilgrim surge",
                "curator_note": "Enter through Vaikuntam Cue Complex 2 for scheduled slot."
            },
            {
                "time": "10:30 AM",
                "activity": "Silathoranam & Chakra Theertham",
                "desc": "Rare 1.5-billion-year-old natural rock arch formation and peaceful holy theertham pond.",
                "duration": "1 hr",
                "lat": 13.6917,
                "lng": 79.3417,
                "local_tip": "Only 1.2 km from main temple. Peaceful garden walkway away from queues.",
                "best_time_to_visit": "Late morning before midday sun"
            },
            {
                "time": "12:30 PM",
                "activity": "Authentic Tirumala Prasadam & Anna Prasadam Hall",
                "desc": "World-famous piping hot laddu collection and Tarigonda Vengamamba free meal complex.",
                "duration": "1 hr",
                "lat": 13.6820,
                "lng": 79.3490,
                "local_tip": "Use token counter 12-18 for quickest collection. The sambar rice in the hall is divine.",
                "best_time_to_visit": "12:00 PM - 1:30 PM"
            },
            {
                "time": "03:30 PM",
                "activity": "Papavinasanam & Akasa Ganga Waterfalls",
                "desc": "Sacred cascading streams surrounded by thick Seshachalam biosphere forest.",
                "duration": "1.5 hrs",
                "lat": 13.7120,
                "lng": 79.3510,
                "local_tip": "Take the local RTC electric bus from CRO (₹15). Fresh tender coconut stalls are excellent.",
                "best_time_to_visit": "3 PM - 5 PM when misty breeze starts"
            },
            {
                "time": "06:30 PM",
                "activity": "Srivari Padalu Sunset Point",
                "desc": "Highest point on Narayanagiri Hill marked by the footprints of Lord Venkateswara.",
                "duration": "1 hr",
                "lat": 13.6980,
                "lng": 79.3320,
                "local_tip": "Breathtaking 360-degree twilight views across the Eastern Ghats gorge.",
                "best_time_to_visit": "Sunset hour"
            }
        ]
    },
    {
        "destination_name": "Tirupati",
        "curator_name": "T.V. Ramanathan",
        "curator_role": "TTD Registered Heritage Guide (22 yrs exp)",
        "curator_rating": 4.9,
        "theme": "Valley Heritage & Chola Architecture",
        "zone": "Tirupati Foothills & Chandragiri",
        "day_number": 2,
        "total_km": 34.0,
        "total_transit_min": 70,
        "items": [
            {
                "time": "07:30 AM",
                "activity": "Sri Govindaraja Swamy Temple",
                "desc": "Monumental 12th-century Dravidian gateway and shrine sanctified by Saint Ramanujacharya.",
                "duration": "1.5 hrs",
                "lat": 13.6300,
                "lng": 79.4180,
                "local_tip": "Located right near railway station. Notice the intricately carved 7-tier gopuram.",
                "best_time_to_visit": "Morning calm"
            },
            {
                "time": "10:00 AM",
                "activity": "Kapila Theertham Waterfalls & Shiva Cave",
                "desc": "Ancient cave shrine where Sage Kapila meditated, located at the steep mountain base.",
                "duration": "1 hr",
                "lat": 13.6520,
                "lng": 79.4230,
                "local_tip": "Feeding monkeys is prohibited. Splashing the cascading spring water washes travel fatigue.",
                "best_time_to_visit": "10 AM"
            },
            {
                "time": "01:00 PM",
                "activity": "Padmavathi Ammavari Temple (Tiruchanur)",
                "desc": "Revered temple of Goddess Padmavathi on the banks of Padma Sarovaram.",
                "duration": "1.5 hrs",
                "lat": 13.6080,
                "lng": 79.4510,
                "local_tip": "Tirupati pilgrimage is traditionally completed only after receiving Ammavari kumkum.",
                "best_time_to_visit": "12:30 PM - 2:00 PM"
            },
            {
                "time": "04:00 PM",
                "activity": "Chandragiri Fort & Raja Mahal",
                "desc": "11th-century Vijayanagara Empire fortress where the British treaty of Madras was signed.",
                "duration": "2 hrs",
                "lat": 13.5830,
                "lng": 79.3170,
                "local_tip": "Sound & light show begins at 6:30 PM. Climb the Raja Mahal upper stone ramparts.",
                "best_time_to_visit": "Late afternoon"
            }
        ]
    },
    {
        "destination_name": "Varanasi",
        "curator_name": "Pandit Rajeshwar Shastri",
        "curator_role": "Kashi Heritage Scholar & River Historian",
        "curator_rating": 4.95,
        "theme": "Ancient Riverfront & Living Ghaats",
        "zone": "Central Riverfront Circuit",
        "day_number": 1,
        "total_km": 8.5,
        "total_transit_min": 35,
        "items": [
            {
                "time": "05:30 AM",
                "activity": "Subah-e-Banaras Boat Crossing at Assi Ghat",
                "desc": "Dawn rowing wooden boat along 84 sacred ghats as morning bells and ragas awaken the city.",
                "duration": "1.5 hrs",
                "lat": 25.2885,
                "lng": 83.0064,
                "local_tip": "Choose a hand-rowed boat instead of diesel motor to glide silently close to stone steps.",
                "best_time_to_visit": "Strictly 5:15 AM - 6:45 AM sunrise"
            },
            {
                "time": "07:30 AM",
                "activity": "Pehlwan Lassi & Kachori Gali Breakfast",
                "desc": "Classic Banarasi breakfast: crisp hing kachoris with aloo subzi and clay-pot malai lassi.",
                "duration": "45 min",
                "lat": 25.3050,
                "lng": 83.0100,
                "local_tip": "Ask for Thandai chashni on the malai top. Cash only.",
                "best_time_to_visit": "Morning"
            },
            {
                "time": "09:00 AM",
                "activity": "Kashi Vishwanath Corridor & Sanctum",
                "desc": "Golden Temple of Shiva connecting directly to Manikarnika Ghat through grand stone corridor.",
                "duration": "2 hrs",
                "lat": 25.3109,
                "lng": 83.0107,
                "local_tip": "Lockers at Gate 4 are free. No electronics or leather belts permitted.",
                "best_time_to_visit": "9:00 AM post-morning mangala aarti rush"
            },
            {
                "time": "03:30 PM",
                "activity": "Silk Weavers Colony (Madanpura Lanes)",
                "desc": "Centuries-old pit-loom handloom workshops weaving authentic Banarasi brocade sarees.",
                "duration": "2 hrs",
                "lat": 25.3000,
                "lng": 83.0030,
                "local_tip": "Always buy directly from master weaver cooperatives (Look for Silk Mark tag).",
                "best_time_to_visit": "Mid afternoon"
            },
            {
                "time": "06:15 PM",
                "activity": "Dashashwamedh Maha Ganga Aarti",
                "desc": "Grand choreographed synchronised brass lamp aarti performed by seven young priests.",
                "duration": "1.5 hrs",
                "lat": 25.3060,
                "lng": 83.0100,
                "local_tip": "Grab a step at Rajendra Prasad Ghat terrace by 5:45 PM for an unobstructed direct angle.",
                "best_time_to_visit": "Twilight 6:00 PM"
            }
        ]
    },
    {
        "destination_name": "Goa",
        "curator_name": "Savio Fernandes",
        "curator_role": "Konkan Trails Naturalist & Coastal Guide",
        "curator_rating": 4.88,
        "theme": "Latin Quarters, Forts & Golden Coast",
        "zone": "North & Central Coast Heritage",
        "day_number": 1,
        "total_km": 24.0,
        "total_transit_min": 50,
        "items": [
            {
                "time": "08:30 AM",
                "activity": "Fontainhas Latin Quarter Walking Trail",
                "desc": "Cobblestone lanes flanked by 18th-century Portuguese pastel manors and red-tiled roofs.",
                "duration": "1.5 hrs",
                "lat": 15.4989,
                "lng": 73.8278,
                "local_tip": "Drop into 31 de Janeiro Bakery for hot Bebinca and fresh prawn puffs at 9 AM.",
                "best_time_to_visit": "Morning before walking heat"
            },
            {
                "time": "11:00 AM",
                "activity": "Basilica of Bom Jesus & Se Cathedral (Old Goa)",
                "desc": "UNESCO World Heritage Baroque churches holding relics of St. Francis Xavier.",
                "duration": "1.5 hrs",
                "lat": 15.5008,
                "lng": 73.9117,
                "local_tip": "Dress modestly (shoulders and knees covered). Admire the hand-carved gilded altar.",
                "best_time_to_visit": "Late morning"
            },
            {
                "time": "01:30 PM",
                "activity": "Fishermans Wharf Portuguese-Goan Lunch",
                "desc": "Traditional clay-pot fish curry thali with red rice, peri-peri prawns and Sol Kadi.",
                "duration": "1.5 hrs",
                "lat": 15.4920,
                "lng": 73.8150,
                "local_tip": "Try Kingfish rava fry seasoned with homemade recheado paste.",
                "best_time_to_visit": "Lunch"
            },
            {
                "time": "04:30 PM",
                "activity": "Aguada Fort & Lower Cliff Ramparts",
                "desc": "17th-century Portuguese coastal fortress overlooking the Mandovi River confluence.",
                "duration": "1.5 hrs",
                "lat": 15.4924,
                "lng": 73.7736,
                "local_tip": "Head down to Sinquerim lower wall bastions for sunset crashing wave views.",
                "best_time_to_visit": "Golden hour 4:30 PM - 6:30 PM"
            }
        ]
    },
    # ------------------ HAMPI ------------------
    {
        "destination_name": "Hampi",
        "curator_name": "K. Venkatesh Murthy",
        "curator_role": "ASI Certified Vijayanagara Historian (18 yrs exp)",
        "curator_rating": 4.94,
        "theme": "Sacred Center & Monolithic Shrines",
        "zone": "Hampi Bazaar & Hemakuta Hill",
        "day_number": 1,
        "total_km": 6.2,
        "total_transit_min": 25,
        "items": [
            {
                "time": "07:00 AM",
                "activity": "Virupaksha Temple & Morning Puja",
                "desc": "Active 7th-century Dravidian temple complex dedicated to Lord Shiva, towering over the ancient bazaar.",
                "duration": "2 hrs",
                "lat": 15.3353,
                "lng": 76.4600,
                "local_tip": "Arrive at 7 AM to witness the temple elephant Lakshmi receiving her morning river bath. Modest dress required.",
                "best_time_to_visit": "Early morning before rock surfaces heat up"
            },
            {
                "time": "09:30 AM",
                "activity": "Hemakuta Hill Monolithic Ganesha Shrines",
                "desc": "Gentle sloping granite outcrop covered in pre-Vijayanagara triple-chambered shrines, Sasivekalu and Kadalekalu Ganesha.",
                "duration": "1.5 hrs",
                "lat": 15.3330,
                "lng": 76.4590,
                "local_tip": "Climb up behind Sasivekalu Ganesha for uninterrupted view of the 50-meter Virupaksha Gopuram.",
                "best_time_to_visit": "Mid-morning breeze"
            },
            {
                "time": "12:30 PM",
                "activity": "Authentic South Indian Thali at Mango Tree",
                "desc": "Iconic riverside cafe serving banana-leaf meals, iced ginger-lemon juice, and fresh Karnataka thalis.",
                "duration": "1 hr",
                "lat": 15.3340,
                "lng": 76.4620,
                "local_tip": "Sit on the floor cushions. Try the banana flower curry if available.",
                "best_time_to_visit": "12:30 PM - 1:30 PM"
            },
            {
                "time": "03:30 PM",
                "activity": "Krishna Temple & Sacred Carved Bazaar",
                "desc": "16th-century temple built by King Krishnadevaraya celebrating victory over Gajapatis of Odisha.",
                "duration": "1.5 hrs",
                "lat": 15.3300,
                "lng": 76.4630,
                "local_tip": "Examine the rare inverted infant Krishna reliefs carved into the inner sub-shrine lintels.",
                "best_time_to_visit": "3:30 PM"
            },
            {
                "time": "05:30 PM",
                "activity": "Matanga Hill Golden Sunset Over the Ruins",
                "desc": "Highest point in central Hampi with 360-degree aerial panorama of the boulder valley and Tungabhadra River.",
                "duration": "1.5 hrs",
                "lat": 15.3315,
                "lng": 76.4680,
                "local_tip": "Climb takes 25 mins. Wear shoes with firm grip on granite. Bring a pocket flashlight for descent.",
                "best_time_to_visit": "Strictly 5:15 PM - 6:30 PM sunset"
            }
        ]
    },
    {
        "destination_name": "Hampi",
        "curator_name": "K. Venkatesh Murthy",
        "curator_role": "ASI Certified Vijayanagara Historian (18 yrs exp)",
        "curator_rating": 4.94,
        "theme": "Vijayanagara Imperial Architecture & Stone Chariot",
        "zone": "Royal Center & Vittala Enclosure",
        "day_number": 2,
        "total_km": 11.5,
        "total_transit_min": 35,
        "items": [
            {
                "time": "08:00 AM",
                "activity": "Vijaya Vittala Temple & Stone Chariot",
                "desc": "Pinnacle of Vijayanagara art with the world-renowned stone chariot and 56 musical pillars.",
                "duration": "2.5 hrs",
                "lat": 15.3395,
                "lng": 76.4785,
                "local_tip": "Take the official ASI battery golf cart (₹20) from parking to avoid the 1.5 km sun walk. Tap nothing; listen to acoustic resonance.",
                "best_time_to_visit": "8:00 AM before tour bus groups arrive"
            },
            {
                "time": "11:00 AM",
                "activity": "King's Balance & Riverside Coracle Crossing",
                "desc": "Ancient weighing scale frame where kings were weighed against precious stones, and round wicker coracle ride on the river.",
                "duration": "1.5 hrs",
                "lat": 15.3410,
                "lng": 76.4760,
                "local_tip": "Negotiate coracle crossing (₹100-150) across to Anegundi side. Life jackets are mandatory.",
                "best_time_to_visit": "Late morning"
            },
            {
                "time": "01:30 PM",
                "activity": "Traditional Bellary Thali at Hampi Heritage Eatery",
                "desc": "Hearty North Karnataka thali featuring jowar rotti, yennegai (stuffed brinjal), and chilled buttermilk.",
                "duration": "1 hr",
                "lat": 15.3250,
                "lng": 76.4700,
                "local_tip": "Ask for shenga chigli (peanut jaggery laddu) to finish your meal.",
                "best_time_to_visit": "Lunch"
            },
            {
                "time": "03:30 PM",
                "activity": "Lotus Mahal & Royal Elephant Stables",
                "desc": "Remarkable Indo-Islamic arcaded pavilion and 11 domed chambers for the royal ceremonial elephants.",
                "duration": "1.5 hrs",
                "lat": 15.3195,
                "lng": 76.4715,
                "local_tip": "Single ticket from Vittala Temple covers this complex on the same calendar day; keep your physical QR slip.",
                "best_time_to_visit": "Mid-afternoon shaded lawns"
            },
            {
                "time": "05:30 PM",
                "activity": "Queen's Bath & Stepped Water Tank (Pushkarani)",
                "desc": "Exquisite aquatic pavilion with vaulted plaster corridors and royal geometric stepped reservoir.",
                "duration": "1 hr",
                "lat": 15.3160,
                "lng": 76.4670,
                "local_tip": "Notice the ancient stone aqueduct network that still channels water across the grounds.",
                "best_time_to_visit": "Twilight 5:30 PM"
            }
        ]
    },
    {
        "destination_name": "Hampi",
        "curator_name": "K. Venkatesh Murthy",
        "curator_role": "ASI Certified Vijayanagara Historian (18 yrs exp)",
        "curator_rating": 4.94,
        "theme": "Anegundi Kishkindha Legend & Boulder Sanctuaries",
        "zone": "North Bank Kishkindha Corridor",
        "day_number": 3,
        "total_km": 16.0,
        "total_transit_min": 45,
        "items": [
            {
                "time": "08:00 AM",
                "activity": "Anjaneya Hill (Birthplace of Lord Hanuman)",
                "desc": "Sacred whitewashed temple atop monkey hill offering panoramic views of granite valleys and paddy fields.",
                "duration": "2 hrs",
                "lat": 15.3520,
                "lng": 76.4660,
                "local_tip": "575 steps to summit. Climb early before midday heat. Keep food and plastic bottles hidden from troops of monkeys.",
                "best_time_to_visit": "Morning"
            },
            {
                "time": "11:00 AM",
                "activity": "Anegundi Historic Village & Chintamani Temple",
                "desc": "Pre-Vijayanagara fortified village, cave drawings, and the quiet spot where Rama and Sugriva formed their alliance.",
                "duration": "1.5 hrs",
                "lat": 15.3500,
                "lng": 76.4800,
                "local_tip": "Visit The Kishkinda Trust banana-fiber craft shop supporting local village women artisans.",
                "best_time_to_visit": "Late morning"
            },
            {
                "time": "01:30 PM",
                "activity": "Wood-Fired Pizza & Shakshuka at Udupi Hippie Cafe",
                "desc": "Relaxed garden seating overlooking green paddy fields with Mediterranean and South Indian fusion.",
                "duration": "1.5 hrs",
                "lat": 15.3530,
                "lng": 76.4600,
                "local_tip": "Cool off with a fresh pomegranate lime juice.",
                "best_time_to_visit": "Lunch"
            },
            {
                "time": "04:30 PM",
                "activity": "Sanapur Lake Boulder Cliff & Sunset Coracle Glide",
                "desc": "Pristine emerald irrigation reservoir surrounded by towering balanced granite rocks and calm waters.",
                "duration": "2 hrs",
                "lat": 15.3650,
                "lng": 76.4420,
                "local_tip": "Coracle pilots offer 30-min scenic tours into granite rock gorges. Avoid swimming due to submerged currents.",
                "best_time_to_visit": "Golden hour 4:30 PM - 6:30 PM"
            }
        ]
    }
]

def seed_curated_trails_if_empty(db: Session):
    count = db.query(CuratedTrails).count()
    if count == 0:
        for t in VERIFIED_SEED_TRAILS:
            trail_record = CuratedTrails(
                destination_name=t["destination_name"].strip().title(),
                curator_name=t["curator_name"],
                curator_role=t["curator_role"],
                curator_rating=t["curator_rating"],
                theme=t["theme"],
                zone=t["zone"],
                day_number=t["day_number"],
                items_json=json.dumps(t["items"]),
                total_km=t["total_km"],
                total_transit_min=t["total_transit_min"]
            )
            db.add(trail_record)
        db.commit()

def get_curated_trails_by_destination(db: Session, destination: str):
    dest_clean = destination.strip().title()
    trails = db.query(CuratedTrails).filter(
        CuratedTrails.destination_name.ilike(f"%{dest_clean}%")
    ).order_by(CuratedTrails.day_number.asc()).all()

    if not trails:
        return []

    result = []
    for tr in trails:
        items = []
        try:
            items = json.loads(tr.items_json)
        except Exception:
            pass

        result.append({
            "id": tr.id,
            "destination_name": tr.destination_name,
            "curator_name": tr.curator_name,
            "curator_role": tr.curator_role,
            "curator_rating": tr.curator_rating,
            "theme": tr.theme,
            "zone": tr.zone,
            "day_number": tr.day_number,
            "total_km": tr.total_km,
            "total_transit_min": tr.total_transit_min,
            "items": items
        })
    return result
