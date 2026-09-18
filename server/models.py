from .database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float
from datetime import datetime


class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="traveler")  # traveler, admin, local_guide

    # Travel Preferences
    preferred_budget = Column(String, default="standard")  # budget, standard, luxury
    mobility_requirements = Column(String, nullable=True)  # low_walking, elderly_friendly
    frequent_travel_type = Column(String, default="vacation")  # family, adventure, pilgrimage
    created_at = Column(DateTime, default=datetime.utcnow)


class Destinations(Base):
    __tablename__ = "destinations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    state = Column(String, nullable=False)
    country = Column(String, default="India")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    tagline = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated: "beach,nightlife,food"
    avg_daily_budget = Column(Integer, nullable=False)


class Places(Base):
    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)
    google_place_id = Column(String, unique=True, nullable=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # lodging, attraction, restaurant
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    rating = Column(Float, nullable=True)
    total_ratings = Column(Integer, default=0)
    price_level = Column(Integer, nullable=True)  # 0 to 4
    estimated_cost = Column(Integer, default=0)
    photo_url = Column(String, nullable=True)
    source_indicator = Column(String, default="Google Places")  # Google Places, WhatsApp Local
    last_updated = Column(DateTime, default=datetime.utcnow)


class Trips(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    title = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    num_days = Column(Integer, nullable=False)

    # Travellers Breakdown
    adults = Column(Integer, default=2)
    children = Column(Integer, default=0)
    elderly = Column(Integer, default=0)

    # Budget Tracking
    total_budget = Column(Integer, nullable=False)
    estimated_spend = Column(Integer, nullable=False)
    remaining_buffer = Column(Integer, nullable=False)
    budget_status = Column(String, default="Healthy")  # Healthy, Tight, Over

    active_context = Column(String, default="vacation")  # vacation, pilgrimage, adventure
    created_at = Column(DateTime, default=datetime.utcnow)


class ItineraryItems(Base):
    __tablename__ = "itinerary_items"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    day_number = Column(Integer, nullable=False)  # Day 1, 2, 3...
    time_slot = Column(String, nullable=False)  # 08:00, 11:00, 13:00
    item_type = Column(String, nullable=False)  # transport, accommodation, activity, food
    place_id = Column(Integer, ForeignKey("places.id"), nullable=True)
    title = Column(String, nullable=False)
    location_text = Column(String, nullable=True)
    cost = Column(Integer, default=0)
    duration_text = Column(String, nullable=True)
    source_tag = Column(String, nullable=True)  # Verified Source - Google Places
    is_confirmed_booking = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)


class Bookings(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_ref = Column(String, unique=True, index=True, nullable=False)  # BK-894201
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    place_id = Column(Integer, ForeignKey("places.id"), nullable=False)
    item_type = Column(String, nullable=False)  # hotel, transport, activity
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime, nullable=False)
    room_or_ticket_type = Column(String, nullable=True)
    total_amount = Column(Integer, nullable=False)
    status = Column(String, default="CONFIRMED")  # CONFIRMED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)


class EventIntelligence(Base):
    __tablename__ = "event_intelligence"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    event_name = Column(String, nullable=False)  # Brahmotsavam, Sunburn, Rath Yatra
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    estimated_demand = Column(String, nullable=True)  # "1.8M"
    crowd_pressure = Column(String, default="HIGH")  # LOW, MEDIUM, HIGH
    transport_demand = Column(String, default="HIGH")
    medical_demand = Column(String, default="MEDIUM")
    recommended_actions = Column(String, nullable=True)  # JSON or comma-separated actions
    last_updated = Column(DateTime, default=datetime.utcnow)


class CuratedTrails(Base):
    __tablename__ = "curated_trails"

    id = Column(Integer, primary_key=True, index=True)
    destination_name = Column(String, nullable=False, index=True)  # "tirupati", "goa", "varanasi"
    curator_name = Column(String, nullable=False)  # "T.V. Ramanathan (TTD Registered Heritage Guide)"
    curator_role = Column(String, default="Local Expert Guide")
    curator_rating = Column(Float, default=4.9)
    theme = Column(String, nullable=False)
    zone = Column(String, nullable=True)
    day_number = Column(Integer, nullable=False)
    items_json = Column(String, nullable=False)  # JSON-encoded array of verified waypoints
    total_km = Column(Float, default=15.0)
    total_transit_min = Column(Integer, default=45)
    created_at = Column(DateTime, default=datetime.utcnow)
