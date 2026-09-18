import os
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import time
from collections import defaultdict

# Manually load .env to avoid requiring python-dotenv pip package
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v

from .database import engine, get_db
from . import models

# Automatically create all SQLite tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Travel Agent Backend API",
    description="FastAPI Backend for AI-Powered Travel Agent with Security",
    version="1.1.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SECURITY: 1. Payload Size Limiting Middleware
MAX_PAYLOAD_SIZE = 2 * 1024 * 1024  # 2MB
@app.middleware("http")
async def limit_payload_size(request: Request, call_next):
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_PAYLOAD_SIZE:
            return JSONResponse(status_code=413, content={"detail": "Payload too large (Max 2MB)"})
    return await call_next(request)

# SECURITY: 2. Rate Limiting Middleware
rate_limit_records = defaultdict(list)
RATE_LIMIT_MAX_REQUESTS = 60
RATE_LIMIT_WINDOW_SECS = 60

@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    client_ip = request.client.host
    now = time.time()
    
    # Clean up old records
    rate_limit_records[client_ip] = [t for t in rate_limit_records[client_ip] if now - t < RATE_LIMIT_WINDOW_SECS]
    
    if len(rate_limit_records[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(status_code=429, content={"detail": "Too many requests. Please slow down."})
        
    rate_limit_records[client_ip].append(now)
    return await call_next(request)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "AI Travel Agent FastAPI Backend is running securely!"
    }

# SECURITY: 3. Pydantic Models for Input Validation and Sanitization
class BudgetOptimizeRequest(BaseModel):
    total_budget: int = Field(..., gt=0, le=10000000)
    num_days: int = Field(..., gt=0, le=365)
    pax: int = Field(..., gt=0, le=100)
    current_breakdown: dict = {}

class ReplanRequest(BaseModel):
    destination: str = Field(..., max_length=100)
    itinerary: list = []
    disruption_type: str = Field(..., max_length=50)

class TransitRequest(BaseModel):
    items: list = []


# PAIR 1 ENDPOINTS
@app.get("/api/places/hotels")
def get_hotels(destination: str = "Goa", max_price: int = 5000, db: Session = Depends(get_db)):
    places = db.query(models.Places).filter(
        models.Places.category == "lodging",
        models.Places.estimated_cost <= max_price
    ).all()
    return {"status": "success", "count": len(places), "data": places}

# PAIR 2 ENDPOINTS
from .modules.budget_replanner import optimize_budget, replan_itinerary_disruption, calculate_transit_between_stops

@app.post("/api/budget/optimize")
def post_optimize_budget(payload: BudgetOptimizeRequest):
    result = optimize_budget(
        total_budget=payload.total_budget,
        num_days=payload.num_days,
        pax=payload.pax,
        current_breakdown=payload.current_breakdown
    )
    return {"status": "success", "data": result}

@app.post("/api/itinerary/replan")
def post_replan_itinerary(payload: ReplanRequest):
    result = replan_itinerary_disruption(
        destination=payload.destination,
        itinerary=payload.itinerary,
        disruption_type=payload.disruption_type
    )
    return {"status": "success", "data": result}

@app.post("/api/itinerary/transit")
def post_calculate_transit(payload: TransitRequest):
    result = calculate_transit_between_stops(payload.items)
    return {"status": "success", "data": result}

# PAIR 3 ENDPOINTS
from .modules.admin_actions import generate_admin_recommendations
from .modules.context_module import detect_trip_context

@app.get("/api/context/detect")
def get_context_detection(destination: str = "Tirupati", preferences: str = "", elderly_count: int = 0):
    pref_list = [p.strip() for p in preferences.split(",") if p.strip()]
    return {"status": "success", "data": detect_trip_context(destination, pref_list, elderly_count)}

@app.get("/api/admin/event-intelligence")
def get_event_intelligence(
    destination: str,
    travel_date: str = None,
    crowd_pressure: str = None,
    transport_demand: str = None,
    medical_demand: str = None,
    db: Session = Depends(get_db)
):
    intelligence_data = generate_admin_recommendations(
        destination=destination,
        crowd_pressure=crowd_pressure,
        transport_demand=transport_demand,
        medical_demand=medical_demand,
        travel_date=travel_date
    )
    return {"status": "success", "data": intelligence_data}

# PAIR 4 ENDPOINTS - LIVE WEB SCRAPER (Replacement for Google Places API)
from .modules.scraper import scrape_places

@app.get("/api/places/live-search")
def live_search_places(query: str, type: str = None):
    results = scrape_places(query, type)
    return {"status": "success", "count": len(results), "data": results}

# HUMAN-CURATED TRAILS ENDPOINTS (Community & Certified Local Guide Registry)
from .modules.curated_trails_service import (
    seed_curated_trails_if_empty,
    get_curated_trails_by_destination
)

@app.on_event("startup")
def startup_curated_seed():
    db = next(get_db())
    try:
        seed_curated_trails_if_empty(db)
    finally:
        db.close()

class CuratedTrailCreateRequest(BaseModel):
    destination_name: str = Field(..., max_length=100)
    curator_name: str = Field(..., max_length=120)
    curator_role: str = Field(..., max_length=150)
    curator_rating: float = Field(default=4.8, ge=1.0, le=5.0)
    theme: str = Field(..., max_length=150)
    zone: str = Field(..., max_length=150)
    day_number: int = Field(..., ge=1, le=30)
    items: list = Field(..., min_items=1)
    total_km: float = Field(default=0.0, ge=0.0)
    total_transit_min: int = Field(default=0, ge=0)

@app.get("/api/curated-trails")
def get_curated_trails(destination: str, db: Session = Depends(get_db)):
    """Fetch verified human-curated circuits for a destination."""
    trails = get_curated_trails_by_destination(db, destination)
    return {
        "status": "success",
        "destination": destination,
        "count": len(trails),
        "data": trails
    }

@app.post("/api/curated-trails")
def create_curated_trail(payload: CuratedTrailCreateRequest, db: Session = Depends(get_db)):
    """Register a new human/guide-curated trail in the database."""
    import json
    trail_record = models.CuratedTrails(
        destination_name=payload.destination_name.strip().title(),
        curator_name=payload.curator_name.strip(),
        curator_role=payload.curator_role.strip(),
        curator_rating=payload.curator_rating,
        theme=payload.theme.strip(),
        zone=payload.zone.strip(),
        day_number=payload.day_number,
        items_json=json.dumps(payload.items),
        total_km=payload.total_km,
        total_transit_min=payload.total_transit_min
    )
    db.add(trail_record)
    db.commit()
    db.refresh(trail_record)
    return {"status": "success", "message": "Trail registered successfully", "id": trail_record.id}
