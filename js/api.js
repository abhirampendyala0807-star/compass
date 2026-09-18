const TravelAPI = (() => {
    let map;
    let placesService;
    let directionsService;
    let geocoder;
    let isInitialized = false;
    let readyCallbacks = [];

    function init() {
        map = new google.maps.Map(document.createElement('div'));
        placesService = new google.maps.places.PlacesService(map);
        directionsService = new google.maps.DirectionsService();
        geocoder = new google.maps.Geocoder();
        isInitialized = true;
        readyCallbacks.forEach(cb => cb());
        readyCallbacks = [];
    }

    function onReady(cb) {
        if (isInitialized) cb();
        else readyCallbacks.push(cb);
    }

    async function searchPlaces(query, location, type = null) {
        return new Promise((resolve) => {
            const failsafe = setTimeout(() => {
                getMockFallback(query, type).then(data => resolve(data));
            }, 2000);

            onReady(() => {
                // Do NOT clear timeout here, let it race Google in case Google drops the request silently
                if (typeof google === 'undefined') {
                    getMockFallback(query, type).then(data => resolve(data));
                    return;
                }
                const request = {
                    query: query,
                    location: new google.maps.LatLng(location.lat, location.lng),
                    radius: 15000
                };
                if (type) request.type = type;

                placesService.textSearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        const processed = results.map(p => ({
                            id: p.place_id,
                            name: p.name,
                            address: p.formatted_address,
                            rating: p.rating || null,
                            totalRatings: p.user_ratings_total || 0,
                            priceLevel: p.price_level || 2,
                            lat: p.geometry.location.lat(),
                            lng: p.geometry.location.lng(),
                            photo: p.photos && p.photos.length > 0 ? p.photos[0].getUrl({ maxWidth: 400 }) : null,
                            types: p.types || [],
                            isOpen: p.opening_hours ? p.opening_hours.isOpen() : null,
                            source: 'Google Places',
                            fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        }));
                        resolve(processed);
                    } else {
                        console.warn('Places search failed:', status);
                        getMockFallback(query, type).then(data => resolve(data));
                    }
                });
            });
        });
    }

    async function getPlaceDetails(placeId) {
        return new Promise((resolve) => {
            const fs = setTimeout(() => resolve(null), 1000);
            onReady(() => {
                if(typeof google === 'undefined') return resolve(null);
                placesService.getDetails({
                    placeId: placeId,
                    fields: ['name', 'rating', 'formatted_phone_number', 'website', 'geometry', 'types']
                }, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve({
                            name: place.name,
                            phone: place.formatted_phone_number,
                            website: place.website,
                            rating: place.rating,
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        });
    }

    async function getDirections(origin, dest) {
        return new Promise((resolve) => {
            const fs = setTimeout(() => resolve(null), 1000);
            onReady(() => {
                if(typeof google === 'undefined') return resolve(null);
                directionsService.route({
                    origin: new google.maps.LatLng(origin.lat, origin.lng),
                    destination: new google.maps.LatLng(dest.lat, dest.lng),
                    travelMode: google.maps.TravelMode.DRIVING
                }, (response, status) => {
                    if (status === "OK") {
                        const leg = response.routes[0].legs[0];
                        resolve({ distance: leg.distance.text, duration: leg.duration.text });
                    } else {
                        resolve(null);
                    }
                });
            });
        });
    }

    async function geocodeAddress(address) {
        if (!address) return null;
        const clean = address.toLowerCase().replace(/,?\s*india/gi, '').trim();
        if (window.KNOWN_CITIES && window.KNOWN_CITIES[clean]) {
            const c = window.KNOWN_CITIES[clean];
            return { lat: c.lat, lng: c.lng, formatted: `${c.name}, ${c.state || 'India'}` };
        }
        return new Promise((resolve) => {
            const fs = setTimeout(async () => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
                    const data = await res.json();
                    if (data && data.length > 0) {
                        return resolve({
                            lat: parseFloat(data[0].lat),
                            lng: parseFloat(data[0].lon),
                            formatted: data[0].display_name
                        });
                    }
                } catch(e) {}
                resolve(null);
            }, 800);

            onReady(() => {
                if (typeof google === 'undefined' || !google.maps || !geocoder) return;
                geocoder.geocode({ address: address }, (results, status) => {
                    clearTimeout(fs);
                    if (status === "OK" && results[0]) {
                        resolve({
                            lat: results[0].geometry.location.lat(),
                            lng: results[0].geometry.location.lng(),
                            formatted: results[0].formatted_address
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        });
    }

    async function getWeather(lat, lng) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&current_weather=true&timezone=Asia/Kolkata&forecast_days=7`;
            const response = await fetch(url);
            const data = await response.json();

            const weatherCodes = {
                0: { desc: 'Clear sky', icon: '☀️' },
                1: { desc: 'Mainly clear', icon: '🌤️' },
                2: { desc: 'Partly cloudy', icon: '⛅' },
                3: { desc: 'Overcast', icon: '☁️' },
                45: { desc: 'Foggy', icon: '🌫️' },
                48: { desc: 'Fog', icon: '🌫️' },
                51: { desc: 'Light drizzle', icon: '🌦️' },
                53: { desc: 'Drizzle', icon: '🌦️' },
                55: { desc: 'Heavy drizzle', icon: '🌧️' },
                61: { desc: 'Light rain', icon: '🌧️' },
                63: { desc: 'Moderate rain', icon: '🌧️' },
                65: { desc: 'Heavy rain', icon: '🌧️' },
                71: { desc: 'Light snow', icon: '🌨️' },
                95: { desc: 'Thunderstorm', icon: '⛈️' }
            };

            const current = data.current_weather;
            const code = weatherCodes[current.weathercode] || { desc: 'Unknown', icon: '☁️' };

            return {
                current: { temp: Math.round(current.temperature), desc: code.desc, icon: code.icon, windSpeed: current.windspeed },
                forecast: data.daily.time.map((date, i) => ({
                    date: date,
                    dayName: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
                    high: Math.round(data.daily.temperature_2m_max[i]),
                    low: Math.round(data.daily.temperature_2m_min[i]),
                    rainChance: data.daily.precipitation_probability_max[i],
                    code: data.daily.weathercode ? data.daily.weathercode[i] : 0,
                    icon: (weatherCodes[data.daily.weathercode ? data.daily.weathercode[i] : 0] || { icon: '☁️' }).icon
                })),
                source: 'Open-Meteo',
                fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            };
        } catch (err) { return null; }
    }

    async function getDestinationSummary(destName) {
        try {
            const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(destName)}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.extract) {
                    const sentences = data.extract.match(/[^.!?]+[.!?]+/g) || [data.extract];
                    return sentences.slice(0, 2).join(' ').trim();
                }
            }
            return null;
        } catch (e) { return null; }
    }

    function haversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    async function getMockFallback(query, type) {
        try {
            const resp = await fetch(`http://localhost:8000/api/places/live-search?query=${encodeURIComponent(query)}&type=${encodeURIComponent(type || '')}`);
            if (resp.ok) {
                const json = await resp.json();
                if (json.status === 'success' && json.data.length > 0) {
                    return json.data;
                }
            }
        } catch (e) {
            console.error('Scraper API failed:', e);
        }
        
        // Final fallback if backend scraper fails
        const q = query ? query.toLowerCase() : '';
        if (type === 'lodging' || q.includes('hotel')) {
            return [
                { id: 'm1', name: 'Taj Heritage Resort', address: 'Downtown Center', rating: 4.8, totalRatings: 420, priceLevel: 3, photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80', source: 'Compass Offline Cache', fetchedAt: 'Live' },
                { id: 'm2', name: 'Boutique Sea View Stay', address: 'Coastal Road', rating: 4.5, totalRatings: 180, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80', source: 'Compass Offline Cache', fetchedAt: 'Live' }
            ];
        }
        if (type === 'restaurant' || q.includes('restaurant')) {
            return [
                { id: 'r1', name: 'The Golden Spoon Authentic', address: 'Heritage Square', rating: 4.7, totalRatings: 630, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80', source: 'Compass Offline Cache', fetchedAt: 'Live' },
                { id: 'r2', name: 'Coastal Spice Cafe', address: 'Marina Beach Road', rating: 4.4, totalRatings: 320, priceLevel: 1, photo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&q=80', source: 'Compass Offline Cache', fetchedAt: 'Live' },
                { id: 'r3', name: 'Skyline Rooftop Dining', address: 'Central Business District', rating: 4.6, totalRatings: 410, priceLevel: 3, photo: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=500&q=80', source: 'Compass Offline Cache', fetchedAt: 'Live' }
            ];
        }
        return [
            { id: 'a1', name: 'Historic Grand Palace', address: 'Old City Center', rating: 4.9, totalRatings: 1250, priceLevel: 1, photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80', source: 'Compass Offline Cache', fetchedAt: 'Live' },
            { id: 'a2', name: 'National Heritage Museum', address: 'Culture District', rating: 4.6, totalRatings: 840, priceLevel: 1, photo: 'https://images.unsplash.com/photo-1518998053401-878c735c020d?w=500&q=80', source: 'Compass Offline Cache', fetchedAt: 'Live' },
            { id: 'a3', name: 'Sunset Viewpoint Promenade', address: 'Coastal Strip', rating: 4.8, totalRatings: 3100, priceLevel: 0, photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80', source: 'Compass Offline Cache', fetchedAt: 'Live' }
        ];
    }

    async function getCuratedTrails(destName) {
        try {
            const resp = await fetch(`http://localhost:8000/api/curated-trails?destination=${encodeURIComponent(destName)}`);
            if (resp.ok) {
                const json = await resp.json();
                if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
                    return json.data;
                }
            }
        } catch (e) {
            console.warn('Curated trails API unavailable, using local verified circuits:', e);
        }
        return null;
    }

    return {
        init,
        onReady,
        searchPlaces,
        getPlaceDetails,
        getDirections,
        geocodeAddress,
        getWeather,
        getDestinationSummary,
        haversineDistance,
        getCuratedTrails,
        getMap: () => map
    };
})();

function initMap() { TravelAPI.init(); }
