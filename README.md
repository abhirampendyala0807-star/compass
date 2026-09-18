# Compass — AI-Powered Travel Agent Prototype

A prototype for an AI-powered travel agent that plans, manages, and books trips using verified local information.

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/SIH.git
cd SIH

# 2. Set up your API key
cp js/secrets.example.js js/secrets.js
# Open js/secrets.js and paste the Google API key (ask Abhiram)

# 3. Run the dev server
python3 -m http.server 3000

# 4. Open http://localhost:3000
```

## Project Structure

```
SIH/
├── index.html              # App shell — all views/screens
├── css/
│   └── style.css           # Design system (colors, components, layout)
├── js/
│   ├── config.js           # Destination data, budget ratios, constants
│   ├── secrets.js          # YOUR API key (gitignored, never commit)
│   ├── secrets.example.js  # Template — copy to secrets.js
│   ├── api.js              # Google Places + Directions + Weather API wrappers
│   └── app.js              # Main logic — routing, trip building, rendering
└── .gitignore
```

## APIs Used

| API | What For | Auth |
|-----|----------|------|
| Google Places API | Hotels, restaurants, attractions (live data) | API key in secrets.js |
| Google Directions API | Route distances and travel times | Same key |
| Google Maps JavaScript API | Embedded maps | Same key |
| Google Geocoding API | Convert place names to coordinates | Same key |
| Open-Meteo | Live weather forecasts | No key needed |

## How It Works

```
User enters trip details
        ↓
App queries Google Places for real hotels, restaurants, attractions
        ↓
App fetches live weather from Open-Meteo
        ↓
Trip engine builds an optimized day-by-day itinerary
        ↓
Dashboard displays everything with source indicators
```

## What's Built (5-10%)

- [x] Landing page with example prompts
- [x] Trip creation form (destination, dates, travelers, budget, preferences)
- [x] AI trip-building animation
- [x] Trip dashboard with budget breakdown
- [x] Day-by-day itinerary timeline (live Google Places data)
- [x] Hotel discovery with filtering (live data)
- [x] Live weather widget
- [x] Explore destinations page
- [x] Source/trust indicators on all data

## What's Left (for the team)

- [ ] AI chat assistant (persistent, action-capable)
- [ ] Dynamic replanning (traffic alerts, itinerary optimization)
- [ ] Hotel booking flow (mock checkout)
- [ ] Pilgrimage module (contextual detection)
- [ ] Crowd management & mass-event intelligence dashboard
- [ ] User profiles and saved preferences
- [ ] Budget optimization assistant
- [ ] Transport booking (flights, trains, buses)
- [ ] Restaurant details and reservation

## Team Workflow

1. Create a branch for your feature: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Push and create a pull request: `git push origin feature/your-feature`
4. Get review from at least one teammate before merging

## Important: API Key Safety

- **Never commit `js/secrets.js`** — it's in .gitignore
- Share the API key with teammates through a private message, not in code
- In Google Cloud Console, restrict the key to your domains only
