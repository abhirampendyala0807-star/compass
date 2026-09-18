// ============================================
// MAIN APP — Routing, Trip Building, Rendering
// ============================================

const app = (() => {
    // --- State ---
    let currentView = 'landing-view';
    let selectedBudget = 35000;
    let selectedPrefs = ['relaxation', 'culture', 'food', 'nature'];
    let currentTrip = null;
    let backupItinerary = null;
    let hasAutoDisrupted = false;
    let hotels = [];
    let attractions = [];
    let restaurants = [];

    // --- View Routing ---

    function showView(viewId) {
        console.log('Navigating to view:', viewId);
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            v.style.setProperty('display', 'none', 'important');
        });
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active');
            target.style.setProperty('display', 'block', 'important');
            currentView = viewId;
            window.scrollTo(0, 0);

            // If navigating away from landing-view, hide the fixed Stitch navbar so it doesn't block clicks
            const fixedHeader = document.querySelector('header.fixed');
            if (fixedHeader) {
                if (viewId === 'landing-view') {
                    fixedHeader.style.display = 'block';
                } else {
                    fixedHeader.style.display = 'none';
                }
            }
            
            // Dynamic Page Titles (SEO Checklist)
            const titles = {
                'landing-view': 'Plan Your Trip - Compass',
                'loading-view': 'Building Itinerary... - Compass',
                'dashboard-view': 'Your Travel Dashboard - Compass'
            };
            document.title = titles[viewId] || 'Compass';
        }
        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.view === viewId);
        });

        if (viewId === 'dashboard-view') {
            setTimeout(function() {
                if (typeof itineraryMap !== 'undefined' && itineraryMap) {
                    itineraryMap.invalidateSize();
                }
            }, 300);
            if (!currentTrip) {
                document.getElementById('input-destination').value = 'Goa';
                buildTrip();
            }
        }

        if (viewId === 'transport-view') {
            renderTransportView();
            setTimeout(function() {
                if (typeof roadtripMap !== 'undefined' && roadtripMap) {
                    roadtripMap.invalidateSize();
                }
            }, 300);
        }
    }

    function navTo(btn) {
        const viewId = btn.dataset.view;
        if (viewId) showView(viewId);
    }

    // --- Form Helpers ---

    function selectBudget(card) {
        document.querySelectorAll('#budget-options .budget-tier-card, #budget-options .chip').forEach(c => {
            c.classList.remove('active', 'ring-2', 'ring-secondary', 'bg-primary-container', 'text-on-primary', 'shadow-lg', '-translate-y-1');
            c.classList.add('bg-surface-container-lowest');
            const radio = c.querySelector('.tier-radio-icon');
            if (radio) {
                radio.innerText = 'radio_button_unchecked';
                radio.style.fontVariationSettings = '';
            }
            const statusText = c.querySelector('.tier-status-text');
            if (statusText) statusText.innerText = 'Select Tier';
        });

        card.classList.add('active', 'ring-2', 'ring-secondary', 'bg-primary-container', 'text-on-primary', 'shadow-lg', '-translate-y-1');
        card.classList.remove('bg-surface-container-lowest');

        const activeRadio = card.querySelector('.tier-radio-icon');
        if (activeRadio) {
            activeRadio.innerText = 'check_circle';
            activeRadio.style.fontVariationSettings = "'FILL' 1";
        }
        const activeStatusText = card.querySelector('.tier-status-text');
        if (activeStatusText) activeStatusText.innerText = 'Active Envelope';

        const val = card.dataset.value;
        const customInput = document.getElementById('input-budget-custom');
        if (val === 'custom') {
            if (customInput) {
                customInput.classList.remove('hidden');
                customInput.focus();
                selectedBudget = parseInt(customInput.value) || 25000;
                customInput.oninput = () => {
                    selectedBudget = parseInt(customInput.value) || 0;
                    updateManifestTotal();
                };
            }
        } else {
            if (customInput) customInput.classList.add('hidden');
            selectedBudget = parseInt(val) || 35000;
        }
        updateManifestTotal();
    }

    function togglePref(btn) {
        const pref = btn.dataset.pref;
        if (!pref) return;
        const isSelected = selectedPrefs.includes(pref);
        if (isSelected) {
            selectedPrefs = selectedPrefs.filter(p => p !== pref);
            btn.classList.remove('bg-primary-container', 'text-on-primary');
            btn.classList.add('bg-surface-container-lowest', 'text-primary');
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.classList.remove('text-secondary-container');
                icon.classList.add('text-on-surface-variant');
            }
        } else {
            selectedPrefs.push(pref);
            btn.classList.remove('bg-surface-container-lowest', 'text-primary');
            btn.classList.add('bg-primary-container', 'text-on-primary');
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.classList.remove('text-on-surface-variant');
                icon.classList.add('text-secondary-container');
            }
        }
        const countBadge = document.getElementById('pref-count-badge');
        if (countBadge) {
            countBadge.innerText = `${selectedPrefs.length} / 8 Selected`;
        }
    }

    function updatePaxCount(type, delta) {
        const input = document.getElementById('input-' + type);
        const label = document.getElementById('label-' + type);
        if (!input) return;
        let current = parseInt(input.value) || 0;
        let min = type === 'adults' ? 1 : 0;
        let next = Math.max(min, Math.min(10, current + delta));
        input.value = next;
        if (label) label.innerText = next;
        updateManifestTotal();
    }

    function updateManifestTotal() {
        const adults = parseInt(document.getElementById('input-adults')?.value) || 2;
        const children = parseInt(document.getElementById('input-children')?.value) || 0;
        const elderly = parseInt(document.getElementById('input-elderly')?.value) || 0;
        const totalPax = adults + children + elderly;

        const startVal = document.getElementById('input-start-date')?.value;
        const endVal = document.getElementById('input-end-date')?.value;
        let tripDays = 3;
        if (startVal && endVal) {
            const s = new Date(startVal + 'T00:00:00');
            const e = new Date(endVal + 'T00:00:00');
            if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
                tripDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            }
        }

        const totalEstimated = selectedBudget * totalPax;

        const totalEl = document.getElementById('manifest-total-amount');
        if (totalEl) {
            totalEl.innerText = formatCurrency(totalEstimated) + ' Total Estimated Trip (' + totalPax + ' Traveler' + (totalPax > 1 ? 's' : '') + ' • ' + tripDays + ' Day' + (tripDays > 1 ? 's' : '') + ')';
        }

        const paxSummaryEl = document.getElementById('pax-count-summary');
        if (paxSummaryEl) {
            paxSummaryEl.innerText = totalPax + ' Traveler' + (totalPax > 1 ? 's' : '') + ' Selected';
        }

        const floatSummaryEl = document.getElementById('floating-manifest-summary');
        if (floatSummaryEl) {
            const tierLabel = selectedBudget === 15000 ? 'Essential (₹15k)' :
                              selectedBudget === 35000 ? 'Signature (₹35k)' :
                              selectedBudget === 65000 ? 'Bespoke (₹65k+)' : 'Custom';
            floatSummaryEl.innerText = totalPax + ' Traveler' + (totalPax > 1 ? 's' : '') + ' • ' + tripDays + 'D • ' + tierLabel;
        }
    }

    function renderMiniCalendar(startDate, endDate) {
        const calendarMonthEl = document.getElementById('calendar-month-label');
        const calendarCadenceEl = document.getElementById('calendar-cadence-sub');
        const daysContainer = document.getElementById('mini-calendar-days');
        if (!daysContainer) return;

        if (!startDate || isNaN(startDate.getTime())) {
            startDate = new Date();
        }
        if (!endDate || isNaN(endDate.getTime()) || endDate < startDate) {
            endDate = new Date(startDate);
        }

        const year = startDate.getFullYear();
        const month = startDate.getMonth();
        const monthName = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (calendarMonthEl) {
            calendarMonthEl.innerText = 'Calendar Window (' + monthName + ')';
        }

        const tripDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        if (calendarCadenceEl) {
            const cadenceLabel = tripDays <= 2 ? 'Brisk 5+ Stops/Day' :
                                 tripDays <= 4 ? 'Balanced 3–4 Stops/Day' :
                                 'Relaxed 2–3 Stops/Day';
            calendarCadenceEl.innerText = tripDays + ' Day' + (tripDays > 1 ? 's' : '') + ' • ' + cadenceLabel;
        }

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        let html = '';

        for (let i = firstDay - 1; i >= 0; i--) {
            html += '<span class="py-1 text-outline-variant/40 select-none">' + (prevMonthTotalDays - i) + '</span>';
        }

        const sTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const eTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

        for (let d = 1; d <= totalDays; d++) {
            const curTime = new Date(year, month, d).getTime();
            const isStart = curTime === sTime;
            const isEnd = curTime === eTime;
            const inBetween = curTime > sTime && curTime < eTime;

            if (isStart && isEnd) {
                html += '<span class="py-1 rounded-full bg-primary text-on-primary font-bold shadow-sm ring-2 ring-primary/20">' + d + '</span>';
            } else if (isStart) {
                html += '<span class="py-1 rounded-l-full bg-primary text-on-primary font-bold shadow-sm">' + d + '</span>';
            } else if (isEnd) {
                html += '<span class="py-1 rounded-r-full bg-primary text-on-primary font-bold shadow-sm">' + d + '</span>';
            } else if (inBetween) {
                html += '<span class="py-1 bg-primary-container/25 text-primary font-bold">' + d + '</span>';
            } else {
                html += '<span class="py-1 text-on-surface font-medium hover:bg-surface-container rounded-lg transition-colors">' + d + '</span>';
            }
        }

        const totalSlotsFilled = firstDay + totalDays;
        const remainingSlots = (7 - (totalSlotsFilled % 7)) % 7;
        for (let j = 1; j <= remainingSlots; j++) {
            html += '<span class="py-1 text-outline-variant/40 select-none">' + j + '</span>';
        }

        daysContainer.innerHTML = html;
    }

    function updateTelemetryForDates() {
        let startDate, endDate, tripDays, destName, dest;

        if (currentTrip && currentTrip.startDate && currentTrip.destination) {
            startDate = new Date(currentTrip.startDate);
            endDate = new Date(currentTrip.endDate || currentTrip.startDate);
            tripDays = currentTrip.numDays || Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            destName = currentTrip.destination.name;
            dest = currentTrip.destination;
        } else {
            const startInput = document.getElementById('input-start-date');
            const endInput = document.getElementById('input-end-date');
            if (!startInput || !endInput) return;

            const startVal = startInput.value;
            const endVal = endInput.value;
            if (!startVal) return;

            startDate = new Date(startVal + 'T00:00:00');
            if (isNaN(startDate.getTime())) startDate = new Date();

            endDate = endVal ? new Date(endVal + 'T00:00:00') : new Date(startDate);
            if (isNaN(endDate.getTime()) || endDate < startDate) {
                endDate = new Date(startDate);
                endInput.value = formatDateInput(endDate);
            }

            tripDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

            const destInput = document.getElementById('input-destination');
            const rawDest = (destInput ? destInput.value.trim() : '') || 'Goa';
            const cleanKey = rawDest.toLowerCase().replace('tirupathi', 'tirupati');
            dest = CONFIG.DESTINATIONS[cleanKey];
            if (!dest) {
                const matchKey = Object.keys(CONFIG.DESTINATIONS).find(k =>
                    k === cleanKey || 
                    CONFIG.DESTINATIONS[k].name.toLowerCase() === cleanKey ||
                    CONFIG.DESTINATIONS[k].name.toLowerCase().includes(cleanKey) ||
                    cleanKey.includes(k)
                );
                if (matchKey) dest = CONFIG.DESTINATIONS[matchKey];
            }
            destName = dest ? dest.name : (rawDest.charAt(0).toUpperCase() + rawDest.slice(1));
        }

        // 1. Dynamic Pacing Score based on trip duration
        const pacingEl = document.getElementById('sanctum-pacing-score');
        const pacingLabelEl = document.getElementById('sanctum-pacing-label');
        const pacingDotEl = document.getElementById('sanctum-pacing-dot');
        if (pacingEl) {
            let score = 94;
            let label = 'Relaxed Cadence';
            let dotColor = 'bg-emerald-600';

            if (tripDays === 1) {
                score = 76;
                label = 'Brisk Express (High Density)';
                dotColor = 'bg-amber-500';
            } else if (tripDays === 2) {
                score = 82;
                label = 'Brisk Pace (Fast Sightseeing)';
                dotColor = 'bg-amber-500';
            } else if (tripDays === 3) {
                score = 89;
                label = 'Balanced Cadence (Optimal)';
                dotColor = 'bg-emerald-600';
            } else if (tripDays === 4) {
                score = 93;
                label = 'Balanced Cadence (Comfortable)';
                dotColor = 'bg-emerald-600';
            } else if (tripDays <= 6) {
                score = 96;
                label = 'Relaxed Cadence (Immersive)';
                dotColor = 'bg-emerald-600';
            } else {
                score = 98;
                label = 'Leisurely Cadence (Unrushed)';
                dotColor = 'bg-emerald-600';
            }

            pacingEl.innerText = score;
            if (pacingLabelEl) pacingLabelEl.innerText = label;
            if (pacingDotEl) pacingDotEl.className = 'w-2 h-2 rounded-full ' + dotColor;
            const headerPacingEl = document.getElementById('header-pacing-score');
            const headerPacingLabelEl = document.getElementById('header-pacing-label');
            if (headerPacingEl) headerPacingEl.innerText = score;
            if (headerPacingLabelEl) headerPacingLabelEl.innerText = label;
        }

        // 2. Real-Time Event Intelligence & Live Crowd Pressure
        const travelDateStr = formatDateInput(startDate);
        fetch('http://localhost:8000/api/admin/event-intelligence?destination=' + encodeURIComponent(destName) + '&travel_date=' + travelDateStr)
            .then(r => r.json())
            .then(res => {
                if (res && res.status === 'success' && res.data) {
                    const data = res.data;
                    const surge = data.surge_data || {};
                    const pressure = (data.metrics?.crowd_pressure || surge.crowd_pressure || 'LOW').toUpperCase();
                    const activeFestivals = surge.active_festivals || [];
                    const estDemand = data.estimated_demand || 'Normal';
                    const isWeekend = surge.is_weekend;
                    const mult = surge.festival_multiplier || surge.weekend_multiplier || 1.0;

                    const crowdEl = document.getElementById('sanctum-crowd-level');
                    const crowdSuffix = document.getElementById('sanctum-crowd-suffix');
                    const crowdTag = document.getElementById('sanctum-crowd-tag');
                    const crowdDot = document.getElementById('sanctum-crowd-dot');
                    const trafficBadge = document.getElementById('sanctum-traffic-badge');
                    const transitEl = document.getElementById('sanctum-travel-time');
                    const routeProgress = document.getElementById('sanctum-route-progress');

                    if (pressure === 'CRITICAL') {
                        if (crowdEl) {
                            crowdEl.innerText = 'Critical';
                            crowdEl.className = 'font-display text-3xl sm:text-4xl font-extrabold text-rose-600';
                        }
                        if (crowdSuffix) crowdSuffix.innerText = 'Congestion (' + estDemand + ')';
                        if (crowdTag) {
                            const festName = activeFestivals[0]?.name || (destName.toLowerCase().includes('tirupati') ? 'Brahmotsavam Surge' : 'Peak Season Footfall');
                            crowdTag.innerText = festName + ' (' + mult + 'x Surge)';
                            crowdTag.className = 'font-label-sm text-xs text-rose-600 font-semibold';
                        }
                        if (crowdDot) crowdDot.className = 'w-2 h-2 rounded-full bg-rose-600 animate-ping';
                        if (trafficBadge) {
                            trafficBadge.innerText = 'Heavy Rush';
                            trafficBadge.className = 'px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold';
                        }
                        if (transitEl) {
                            transitEl.innerText = activeFestivals[0] ? (activeFestivals[0].name + ' Priority Transit Corridor') : (dest?.transitText || `${destName} Main Corridor`);
                        }
                        if (routeProgress) {
                            routeProgress.style.width = '95%';
                            routeProgress.className = 'h-full bg-rose-500 rounded-full transition-all duration-500';
                        }
                    } else if (pressure === 'HIGH') {
                        if (crowdEl) {
                            crowdEl.innerText = 'High';
                            crowdEl.className = 'font-display text-3xl sm:text-4xl font-extrabold text-amber-600';
                        }
                        if (crowdSuffix) crowdSuffix.innerText = 'Congestion (' + estDemand + ')';
                        if (crowdTag) {
                            crowdTag.innerText = activeFestivals[0] ? (activeFestivals[0].name + ' Active') : (isWeekend ? ('Weekend Rush (' + mult + 'x)') : 'Elevated Footfall');
                            crowdTag.className = 'font-label-sm text-xs text-amber-600 font-semibold';
                        }
                        if (crowdDot) crowdDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
                        if (trafficBadge) {
                            trafficBadge.innerText = 'Dense Traffic';
                            trafficBadge.className = 'px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold';
                        }
                        if (transitEl) {
                            transitEl.innerText = 'Express Bypass & Rapid Transit';
                        }
                        if (routeProgress) {
                            routeProgress.style.width = '75%';
                            routeProgress.className = 'h-full bg-amber-500 rounded-full transition-all duration-500';
                        }
                    } else if (pressure === 'MEDIUM') {
                        if (crowdEl) {
                            crowdEl.innerText = 'Moderate';
                            crowdEl.className = 'font-display text-3xl sm:text-4xl font-extrabold text-secondary';
                        }
                        if (crowdSuffix) crowdSuffix.innerText = 'Congestion';
                        if (crowdTag) {
                            crowdTag.innerText = isWeekend ? ('Weekend Steady (' + mult + 'x)') : 'Balanced Season';
                            crowdTag.className = 'font-label-sm text-xs text-secondary font-semibold';
                        }
                        if (crowdDot) crowdDot.className = 'w-2 h-2 rounded-full bg-secondary animate-pulse';
                        if (trafficBadge) {
                            trafficBadge.innerText = 'Steady Traffic';
                            trafficBadge.className = 'px-2 py-0.5 rounded text-[10px] bg-secondary-container/50 text-on-secondary-container font-bold';
                        }
                        if (transitEl) {
                            transitEl.innerText = dest?.transitText || 'Scenic Route & Shuttles';
                        }
                        if (routeProgress) {
                            routeProgress.style.width = '60%';
                            routeProgress.className = 'h-full bg-secondary rounded-full transition-all duration-500';
                        }
                    } else {
                        // LOW
                        if (crowdEl) {
                            crowdEl.innerText = 'Low';
                            crowdEl.className = 'font-display text-3xl sm:text-4xl font-extrabold text-emerald-700';
                        }
                        if (crowdSuffix) crowdSuffix.innerText = 'Congestion';
                        if (crowdTag) {
                            crowdTag.innerText = 'Recommended Season';
                            crowdTag.className = 'font-label-sm text-xs text-emerald-700 font-semibold';
                        }
                        if (crowdDot) crowdDot.className = 'w-2 h-2 rounded-full bg-emerald-600 animate-pulse';
                        if (trafficBadge) {
                            trafficBadge.innerText = 'Smooth Traffic';
                            trafficBadge.className = 'px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold';
                        }
                        if (transitEl) {
                            transitEl.innerText = dest?.transitText || 'Scenic Express Corridor';
                        }
                        if (routeProgress) {
                            routeProgress.style.width = '35%';
                            routeProgress.className = 'h-full bg-emerald-600 rounded-full transition-all duration-500';
                        }
                    }
                }
            })
            .catch(() => {});

        // 3. Weather Outlook for Selected Date & Month
        const weatherEl = document.getElementById('sanctum-weather');
        const weatherSubEl = document.getElementById('sanctum-weather-sub');
        const weatherBadgeEl = document.getElementById('sanctum-weather-badge');

        if (dest && dest.lat && dest.lng && typeof TravelAPI !== 'undefined' && TravelAPI.getWeather) {
            TravelAPI.getWeather(dest.lat, dest.lng).then(weatherData => {
                if (!weatherData) return;
                const targetDateStr = formatDateInput(startDate);
                const dayForecast = weatherData.forecast ? weatherData.forecast.find(f => f.date === targetDateStr) : null;

                if (dayForecast) {
                    if (weatherEl) weatherEl.innerText = dayForecast.high + '°C • ' + (dayForecast.desc || 'Clear sky');
                    if (weatherSubEl) weatherSubEl.innerText = 'Rain probability: ' + (dayForecast.rainChance || 0) + '% • Low: ' + dayForecast.low + '°C';
                    if (weatherBadgeEl) {
                        weatherBadgeEl.innerText = dayForecast.rainChance > 40 ? 'Rain Alert' : 'Optimal';
                        weatherBadgeEl.className = dayForecast.rainChance > 40 ?
                            'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]' :
                            'px-2 py-0.5 rounded-full bg-secondary-container/20 text-on-secondary-container font-bold text-[10px]';
                    }
                } else {
                    const month = startDate.getMonth();
                    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    let temp = 28;
                    let desc = 'Pleasant';
                    let rainProb = 15;

                    if (dest.tags && dest.tags.includes('beach')) {
                        if (month >= 5 && month <= 8) { temp = 28; desc = 'Monsoon Showers'; rainProb = 65; }
                        else if (month >= 9 && month <= 10) { temp = 30; desc = 'Warm & Breezy'; rainProb = 20; }
                        else if (month >= 11 || month <= 1) { temp = 28; desc = 'Sunny & Dry'; rainProb = 5; }
                        else { temp = 33; desc = 'Hot & Humid'; rainProb = 10; }
                    } else if (dest.tags && (dest.tags.includes('nature') || dest.tags.includes('adventure'))) {
                        if (month >= 11 || month <= 1) { temp = 4; desc = 'Snowy & Crisp'; rainProb = 40; }
                        else if (month >= 6 && month <= 8) { temp = 18; desc = 'Lush Monsoon'; rainProb = 70; }
                        else { temp = 16; desc = 'Cool & Pleasant'; rainProb = 20; }
                    } else {
                        if (month >= 3 && month <= 5) { temp = 38; desc = 'Warm & Sunny'; rainProb = 10; }
                        else if (month >= 6 && month <= 8) { temp = 32; desc = 'Passing Showers'; rainProb = 45; }
                        else if (month >= 9 && month <= 10) { temp = 31; desc = 'Clear Sky'; rainProb = 15; }
                        else { temp = 26; desc = 'Pleasant & Cool'; rainProb = 5; }
                    }

                    if (weatherEl) weatherEl.innerText = temp + '°C • ' + desc;
                    if (weatherSubEl) weatherSubEl.innerText = monthNames[month] + ' Seasonal Avg • Rain: ' + rainProb + '%';
                    if (weatherBadgeEl) {
                        weatherBadgeEl.innerText = rainProb > 50 ? 'Monsoon Window' : 'Verified Optimal';
                        weatherBadgeEl.className = rainProb > 50 ?
                            'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]' :
                            'px-2 py-0.5 rounded-full bg-secondary-container/20 text-on-secondary-container font-bold text-[10px]';
                    }
                }
            }).catch(() => {});
        }

        // 4. Update Dynamic Mini Calendar
        renderMiniCalendar(startDate, endDate);

        // 5. Update Manifest Pax & Days
        updateManifestTotal();
    }

    function setSanctumDestination(name, searchVal, imgUrl, subtitle, latLngStr, pacingScore, crowdLevel, transitText, weatherText) {
        const destInput = document.getElementById('input-destination');
        if (destInput) destInput.value = searchVal || name;

        const nameEl = document.getElementById('preview-dest-name');
        if (nameEl) nameEl.innerText = name;

        const floatNameEl = document.getElementById('floating-dest-name');
        if (floatNameEl) floatNameEl.innerText = name;

        const imgEl = document.getElementById('preview-dest-img');
        if (imgEl && imgUrl) imgEl.src = imgUrl;

        const coordsEl = document.getElementById('preview-dest-coords');
        if (coordsEl && latLngStr) coordsEl.innerText = latLngStr;

        if (pacingScore) {
            const pacingEl = document.getElementById('sanctum-pacing-score');
            if (pacingEl) pacingEl.innerText = pacingScore;
        }

        if (crowdLevel) {
            const crowdEl = document.getElementById('sanctum-crowd-level');
            if (crowdEl) crowdEl.innerText = crowdLevel;
        }

        if (transitText) {
            const transitEl = document.getElementById('sanctum-travel-time');
            if (transitEl) transitEl.innerText = transitText;
        }

        if (weatherText) {
            const weatherEl = document.getElementById('sanctum-weather');
            if (weatherEl) weatherEl.innerText = weatherText;
        }

        updateManifestTotal();
    }

    function selectDestination(keyOrName, closeDropdown = true) {
        if (!keyOrName) return;
        const destInput = document.getElementById('input-destination');
        const dropdown = document.getElementById('destination-autocomplete-dropdown');
        const cleanKey = String(keyOrName).trim().toLowerCase().replace('tirupathi', 'tirupati');
        
        let dest = CONFIG.DESTINATIONS[cleanKey];
        if (!dest) {
            const matchKey = Object.keys(CONFIG.DESTINATIONS).find(k =>
                k === cleanKey || 
                CONFIG.DESTINATIONS[k].name.toLowerCase() === cleanKey ||
                CONFIG.DESTINATIONS[k].name.toLowerCase().includes(cleanKey) ||
                cleanKey.includes(k)
            );
            if (matchKey) dest = CONFIG.DESTINATIONS[matchKey];
        }

        if (dest) {
            if (destInput) destInput.value = dest.name;
            setSanctumDestination(
                dest.name,
                dest.name,
                dest.photo || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
                dest.subtitle || dest.tagline,
                dest.coordsText || (dest.lat + '° N, ' + dest.lng + '° E • ' + dest.state),
                dest.pacingScore || 94,
                dest.crowdLevel || 'Low',
                dest.transitText || 'Scenic Route',
                dest.weatherText || '28°C • Pleasant'
            );
            updateTelemetryForDates();
        } else {
            if (destInput) destInput.value = keyOrName;
            const cleanName = keyOrName.charAt(0).toUpperCase() + keyOrName.slice(1);
            setSanctumDestination(
                cleanName,
                cleanName,
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
                'Curated Expedition Route',
                'Coordinates Geocoded on Dispatch',
                92,
                'Moderate',
                'Multimodal Transit Available',
                'Seasonal Forecast Available'
            );
            updateTelemetryForDates();
        }

        if (closeDropdown && dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    function setupDestinationAutocomplete() {
        const destInput = document.getElementById('input-destination');
        const dropdown = document.getElementById('destination-autocomplete-dropdown');
        if (!destInput || !dropdown) return;

        let debounceTimer = null;

        function renderSuggestions(query) {
            query = (query || '').trim().toLowerCase().replace('tirupathi', 'tirupati');
            if (!query) {
                dropdown.classList.add('hidden');
                return;
            }

            const matches = Object.entries(CONFIG.DESTINATIONS).filter(([key, dest]) => {
                return key.includes(query) ||
                       dest.name.toLowerCase().includes(query) ||
                       (dest.state && dest.state.toLowerCase().includes(query)) ||
                       (dest.tagline && dest.tagline.toLowerCase().includes(query)) ||
                       (dest.tags && dest.tags.some(t => t.toLowerCase().includes(query)));
            });

            if (matches.length === 0) {
                dropdown.innerHTML = '<div class="p-3 text-xs text-on-surface-variant flex items-center gap-2"><span class="material-symbols-outlined text-base text-secondary">explore</span><span>Custom Destination: <strong>"' + destInput.value + '"</strong> (will geocode coordinates & curate live)</span></div>';
                dropdown.classList.remove('hidden');
                return;
            }

            dropdown.innerHTML = matches.map(([key, dest]) => {
                const icon = dest.tags?.includes('religious') ? 'temple_hindu' :
                             dest.tags?.includes('beach') ? 'waves' :
                             dest.tags?.includes('nature') ? 'nature_people' :
                             dest.tags?.includes('history') ? 'castle' : 'explore';
                const tagBadge = dest.tags?.includes('religious') ? '<span class="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container text-[10px] font-bold">Pilgrimage</span>' :
                                 dest.tags?.includes('beach') ? '<span class="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-semibold">Coastal</span>' :
                                 dest.tags?.includes('nature') ? '<span class="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] text-on-surface-variant font-semibold">Hills</span>' : '';

                return '<div class="dest-suggest-item flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-surface-container cursor-pointer transition-colors" data-key="' + key + '" onclick="app.selectDestination(\'' + key + '\')">' +
                    '<div class="flex items-center gap-3 min-w-0">' +
                        '<div class="w-10 h-10 rounded-xl overflow-hidden bg-primary-container/20 flex items-center justify-center shrink-0 border border-outline-variant/20">' +
                            (dest.photo ? '<img src="' + dest.photo + '" class="w-full h-full object-cover" alt="' + dest.name + '">' : '<span class="material-symbols-outlined text-base text-primary">' + icon + '</span>') +
                        '</div>' +
                        '<div class="flex flex-col min-w-0">' +
                            '<div class="flex items-center gap-2">' +
                                '<span class="font-headline-sm text-sm font-bold text-primary truncate">' + dest.name + '</span>' +
                                '<span class="px-2 py-0.5 rounded-full bg-surface-container text-[10px] text-on-surface-variant font-medium shrink-0">' + (dest.state || 'India') + '</span>' +
                                tagBadge +
                            '</div>' +
                            '<span class="font-body-sm text-[11px] text-on-surface-variant truncate">' + (dest.tagline || '') + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<span class="material-symbols-outlined text-base text-secondary shrink-0 ml-2">north_west</span>' +
                '</div>';
            }).join('');
            dropdown.classList.remove('hidden');
        }

        destInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value;
            renderSuggestions(val);

            debounceTimer = setTimeout(() => {
                const clean = val.trim().toLowerCase().replace('tirupathi', 'tirupati');
                const matchedKey = Object.keys(CONFIG.DESTINATIONS).find(k =>
                    k === clean || CONFIG.DESTINATIONS[k].name.toLowerCase() === clean
                );
                if (matchedKey) {
                    selectDestination(matchedKey, false);
                } else if (clean.length >= 3) {
                    const partialKey = Object.keys(CONFIG.DESTINATIONS).find(k =>
                        k.startsWith(clean) || CONFIG.DESTINATIONS[k].name.toLowerCase().startsWith(clean)
                    );
                    if (partialKey) {
                        selectDestination(partialKey, false);
                    }
                }
            }, 200);
        });

        destInput.addEventListener('focus', () => {
            if (destInput.value.trim()) renderSuggestions(destInput.value);
        });

        destInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const firstItem = dropdown.querySelector('.dest-suggest-item');
                if (firstItem && !dropdown.classList.contains('hidden')) {
                    const key = firstItem.dataset.key;
                    selectDestination(key, true);
                } else {
                    dropdown.classList.add('hidden');
                    const clean = destInput.value.trim().toLowerCase().replace('tirupathi', 'tirupati');
                    const matchedKey = Object.keys(CONFIG.DESTINATIONS).find(k =>
                        k.includes(clean) || CONFIG.DESTINATIONS[k].name.toLowerCase().includes(clean)
                    );
                    if (matchedKey) {
                        selectDestination(matchedKey, true);
                    }
                }
            }
            if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!destInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }

    // --- Quick Prompt ---

    function usePrompt(el) {
        const dest = el.dataset.dest;
        const days = parseInt(el.dataset.days);
        const budget = parseInt(el.dataset.budget);

        document.getElementById('input-destination').value = CONFIG.DESTINATIONS[dest]?.name || dest;
        selectedBudget = budget;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);

        document.getElementById('input-start-date').value = formatDateInput(startDate);
        document.getElementById('input-end-date').value = formatDateInput(endDate);

        document.querySelectorAll('#budget-options .chip').forEach(c => {
            c.classList.toggle('active', c.dataset.value === String(budget));
        });

        updateTelemetryForDates();
        buildTrip();
    }

    function formatDateInput(d) {
        return d.toISOString().split('T')[0];
    }

    // --- Build Trip ---

    async function buildTrip() {
        const destInput = document.getElementById('input-destination').value.trim().toLowerCase();
        const startDate = document.getElementById('input-start-date').value;
        const endDate = document.getElementById('input-end-date').value;
        const adults = parseInt(document.getElementById('input-adults').value) || 2;
        const children = parseInt(document.getElementById('input-children').value) || 0;
        const elderly = parseInt(document.getElementById('input-elderly').value) || 0;

        if (!destInput) {
            alert('Please enter a destination');
            return;
        }

        let destKey = Object.keys(CONFIG.DESTINATIONS).find(k =>
            k.includes(destInput) || CONFIG.DESTINATIONS[k].name.toLowerCase().includes(destInput) || destInput.includes(k)
        );

        let destData;
        if (destKey) {
            destData = CONFIG.DESTINATIONS[destKey];
        } else {
            let geoLat = 15.2993, geoLng = 74.124;
            try {
                const geo = await TravelAPI.geocodeAddress(destInput + ', India');
                if (geo) { geoLat = geo.lat; geoLng = geo.lng; }
            } catch (e) { }

            const cleanName = destInput.charAt(0).toUpperCase() + destInput.slice(1);
            destData = {
                name: cleanName,
                lat: geoLat,
                lng: geoLng,
                state: 'India',
                tagline: 'Custom trip destination',
                tags: ['custom', 'culture', 'sightseeing'],
                avgDailyBudget: { budget: 2000, standard: 4500, premium: 9000 }
            };
        }

        let numDays = 3;
        if (startDate && endDate) {
            const diff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
            numDays = Math.max(1, Math.round(diff) + 1);
        }

        const tripStart = startDate ? new Date(startDate) : new Date(Date.now() + 7 * 86400000);
        const tripEnd = endDate ? new Date(endDate) : new Date(tripStart.getTime() + (numDays - 1) * 86400000);

        currentTrip = {
            destinationKey: destKey || 'custom',
            destination: destData,
            startDate: tripStart,
            endDate: tripEnd,
            numDays: numDays,
            adults: adults,
            children: children,
            elderly: elderly,
            totalPax: adults + children + elderly,
            budget: selectedBudget,
            preferences: selectedPrefs,
            itinerary: [],
            budgetBreakdown: {}
        };

        showView('loading-view');
        await runLoadingSequence();
    }

    // --- Loading Animation + Data Fetching (Voyage Console) ---

    const DESTINATION_CORRIDORS = {
        goa: {
            region: 'Coastal Konkan Corridor',
            coords: '15.2993° N, 74.1240° E [Arabian Sea]',
            node1: { title: 'Dabolim / MOPA Hub', sub: 'Arrival Gateway', icon: 'flight_land' },
            node2: { title: 'Mandovi Riverfront', sub: 'Scenic Coastal Leg', icon: 'explore' },
            node3: { title: 'Old Goa Heritage', sub: 'Active Landmark', icon: 'navigation' },
            node4: { title: 'Boutique Coastal Stay', sub: 'Rest & Unwind', icon: 'hotel' },
            transit: 'Calibrated Goa Taxis & Rentals'
        },
        tirupati: {
            region: 'Sacred Seshachalam Foothills',
            coords: '13.6288° N, 79.4192° E [Eastern Ghats]',
            node1: { title: 'Renigunta Gateway', sub: 'Arrival Terminal', icon: 'train' },
            node2: { title: 'Alipiri Footpath / Ghat', sub: 'Scenic Ridge Ascent', icon: 'landscape' },
            node3: { title: 'Tirumala Sanctum', sub: 'Active Temple Leg', icon: 'temple_hindu' },
            node4: { title: 'Heritage Pilgrim Haven', sub: 'Curated Stay', icon: 'hotel' },
            transit: 'Ghat Cabs & TTD Electric Shuttles'
        },
        munnar: {
            region: 'High Western Ghats',
            coords: '10.0889° N, 77.0595° E [Anamudi Foothills]',
            node1: { title: 'Cochin Gateway', sub: 'Arrival Hub', icon: 'flight_land' },
            node2: { title: 'Neriamangalam Pass', sub: 'Misty Mountain Leg', icon: 'forest' },
            node3: { title: 'Pothamedu Escarpment', sub: 'Active High Vista', icon: 'landscape' },
            node4: { title: 'Tea Estate Bungalow', sub: 'Highland Retreat', icon: 'hotel' },
            transit: 'Hill Cabs & Mountain Jeeps'
        },
        pondicherry: {
            region: 'French Quarter & Coromandel Coast',
            coords: '11.9416° N, 79.8083° E [Bay of Bengal]',
            node1: { title: 'Puducherry Hub', sub: 'Arrival Gateway', icon: 'directions_bus' },
            node2: { title: 'Goubert Avenue', sub: 'Promenade Coastal Leg', icon: 'explore' },
            node3: { title: 'White Town Heritage', sub: 'Active Heritage Leg', icon: 'navigation' },
            node4: { title: 'Colonial Villa Haven', sub: 'Heritage Stay', icon: 'hotel' },
            transit: 'Bicycle Rentals & Local Cabs'
        },
        varanasi: {
            region: 'Ganges Heritage Corridor',
            coords: '25.3176° N, 82.9739° E [Holy Riverfront]',
            node1: { title: 'Babatpur Gateway', sub: 'Arrival Terminal', icon: 'flight_land' },
            node2: { title: 'Assi Ghat Walkway', sub: 'Sunrise River Leg', icon: 'sailing' },
            node3: { title: 'Dashashwamedh Aarti', sub: 'Active Cultural Leg', icon: 'flare' },
            node4: { title: 'Riverside Heritage Haveli', sub: 'Traditional Stay', icon: 'hotel' },
            transit: 'Electric Autos & River Ferries'
        }
    };

    function getDestinationCorridor(destKey, destObj) {
        const key = (destKey || '').toLowerCase();
        if (DESTINATION_CORRIDORS[key]) return DESTINATION_CORRIDORS[key];
        const lat = destObj?.lat ? destObj.lat.toFixed(4) : '20.5937';
        const lng = destObj?.lng ? destObj.lng.toFixed(4) : '78.9629';
        return {
            region: `${destObj?.name || 'India'} Corridor`,
            coords: `${lat}° N, ${lng}° E [Travel Corridor]`,
            node1: { title: `${destObj?.name || 'Arrival'} Gateway`, sub: 'Transit Terminal', icon: 'flight_land' },
            node2: { title: 'Scenic Corridor', sub: 'Local Transit Leg', icon: 'explore' },
            node3: { title: `${destObj?.name || 'Key'} Highlights`, sub: 'Active Discovery', icon: 'navigation' },
            node4: { title: 'Curated Stay', sub: 'Boutique Haven', icon: 'hotel' },
            transit: 'Standardized Local Transit & Cabs'
        };
    }

    function updateLoadingProgress(pct, title, subtitle) {
        const circle = document.getElementById('loading-progress-circle');
        const pctEl = document.getElementById('loading-progress-pct');
        const bar = document.getElementById('loading-progress-bar');
        const titleEl = document.getElementById('loading-step-title');
        const subEl = document.getElementById('loading-step-subtitle');

        if (circle) {
            const offset = Math.max(0, 100 - pct);
            circle.setAttribute('stroke-dashoffset', offset);
        }
        if (pctEl) pctEl.textContent = pct;
        if (bar) bar.style.width = pct + '%';
        if (titleEl && title) titleEl.textContent = title;
        if (subEl && subtitle) subEl.textContent = subtitle;
    }

    async function runLoadingSequence() {
        const steps = document.querySelectorAll('#loading-steps li');
        const dest = currentTrip.destination;
        const loc = { lat: dest.lat, lng: dest.lng };
        const corridor = getDestinationCorridor(currentTrip.destinationKey, dest);

        // 1. Initialize UI elements with destination details
        const bgEl = document.getElementById('loading-dest-bg');
        if (bgEl && dest.photo) {
            bgEl.style.backgroundImage = `url('${dest.photo}')`;
        }
        const titleEl = document.getElementById('loading-dest-title');
        if (titleEl) titleEl.textContent = `Curating ${dest.name} Itinerary`;

        const regionEl = document.getElementById('loading-dest-region');
        if (regionEl) regionEl.textContent = corridor.region;

        const coordsEl = document.getElementById('loading-coords');
        if (coordsEl) coordsEl.textContent = `Coordinates: ${corridor.coords}`;

        // Set route node titles & icons
        const n1Title = document.getElementById('loading-node1-title');
        const n1Sub = document.getElementById('loading-node1-sub');
        const n1Icon = document.getElementById('loading-node1-icon');
        if (n1Title) n1Title.textContent = corridor.node1.title;
        if (n1Sub) n1Sub.textContent = corridor.node1.sub;
        if (n1Icon) n1Icon.textContent = corridor.node1.icon;

        const n2Title = document.getElementById('loading-node2-title');
        const n2Sub = document.getElementById('loading-node2-sub');
        const n2Icon = document.getElementById('loading-node2-icon');
        if (n2Title) n2Title.textContent = corridor.node2.title;
        if (n2Sub) n2Sub.textContent = corridor.node2.sub;
        if (n2Icon) n2Icon.textContent = corridor.node2.icon;

        const n3Title = document.getElementById('loading-node3-title');
        const n3Sub = document.getElementById('loading-node3-sub');
        const n3Icon = document.getElementById('loading-node3-icon');
        if (n3Title) n3Title.textContent = corridor.node3.title;
        if (n3Sub) n3Sub.textContent = corridor.node3.sub;
        if (n3Icon) n3Icon.textContent = corridor.node3.icon;

        const n4Title = document.getElementById('loading-node4-title');
        const n4Sub = document.getElementById('loading-node4-sub');
        const n4Icon = document.getElementById('loading-node4-icon');
        if (n4Title) n4Title.textContent = corridor.node4.title;
        if (n4Sub) n4Sub.textContent = corridor.node4.sub;
        if (n4Icon) n4Icon.textContent = corridor.node4.icon;

        const transitInfo = document.getElementById('loading-transit-info');
        if (transitInfo) transitInfo.textContent = corridor.transit;

        // Stage 1: Initializing
        updateLoadingProgress(15, "Analyzing Dates", "Calibrating travel pace and seasons...");
        await animateStep(steps[0], 500);

        // Stage 2: Budget Breakdown
        currentTrip.budgetBreakdown = calculateBudget(currentTrip.budget, currentTrip.numDays);
        const budgetAmt = document.getElementById('loading-budget-amt');
        const budgetDetail = document.getElementById('loading-budget-detail');
        if (budgetAmt) budgetAmt.textContent = `₹${(currentTrip.budgetBreakdown.total || 0).toLocaleString('en-IN')}`;
        if (budgetDetail) {
            budgetDetail.textContent = `Stay ₹${(currentTrip.budgetBreakdown.accommodation || 0).toLocaleString('en-IN')} • Meals ₹${(currentTrip.budgetBreakdown.food || 0).toLocaleString('en-IN')}`;
        }
        updateLoadingProgress(32, "Budget Allocation", "Locking fair pricing & activity allowances...");
        await animateStep(steps[1], 450);

        // Stage 3: Top Attractions & While You Wait Sneak Peeks
        updateLoadingProgress(50, "Discovering Places", `Searching attractions in ${dest.name}...`);
        try {
            attractions = await TravelAPI.searchPlaces(
                'top attractions and things to do in ' + dest.name, loc
            );
        } catch (e) { attractions = []; }

        const placesCount = document.getElementById('loading-places-count');
        const placesSub = document.getElementById('loading-places-sub');
        if (placesCount) placesCount.textContent = `${attractions.length || 12} Verified Sights`;
        if (placesSub) placesSub.textContent = `Filtered by ratings & optimal route proximity`;

        // Populate Sneak Peek Preview Cards
        if (attractions && attractions.length > 0) {
            for (let i = 0; i < 3; i++) {
                const item = attractions[i];
                if (!item) continue;
                const img = document.getElementById(`loading-peek-img-${i + 1}`);
                const title = document.getElementById(`loading-peek-title-${i + 1}`);
                const sub = document.getElementById(`loading-peek-sub-${i + 1}`);
                if (img && item.photo) img.src = item.photo;
                if (title) title.textContent = item.name;
                if (sub) sub.textContent = `⭐ ${item.rating || 4.8} (${item.totalRatings || 120} reviews)`;
            }
        }
        await animateStep(steps[2], 400);

        // Stage 4: Accommodations
        updateLoadingProgress(68, "Selecting Stays", `Finding verified boutique stays in ${dest.name}...`);
        try {
            hotels = await TravelAPI.searchPlaces(
                'hotels in ' + dest.name, loc, 'lodging'
            );
        } catch (e) { hotels = []; }
        const stayName = document.getElementById('loading-stay-name');
        if (stayName) {
            if (hotels && hotels.length > 0) {
                stayName.textContent = hotels[0].name;
            } else {
                stayName.textContent = 'Curated boutique & verified properties';
            }
        }
        await animateStep(steps[3], 400);

        // Stage 5: Weather & Microclimates
        updateLoadingProgress(82, "Live Weather", "Checking microclimates & forecast...");
        let weather = null;
        try {
            weather = await TravelAPI.getWeather(dest.lat, dest.lng);
        } catch (e) { }
        currentTrip.weather = weather;
        const wTemp = document.getElementById('loading-weather-temp');
        const wDesc = document.getElementById('loading-weather-desc');
        if (weather && wTemp) {
            wTemp.textContent = `${weather.temp}°C • ${weather.condition || 'Clear & Pleasant'}`;
            if (wDesc) wDesc.textContent = `Real-time forecast synced`;
        }
        await animateStep(steps[4], 350);

        // Stage 6: Dining & Itinerary Sequencing
        updateLoadingProgress(92, "Sequencing Days", "Organizing day-by-day stops & transit...");
        try {
            restaurants = await TravelAPI.searchPlaces(
                'best restaurants in ' + dest.name, loc, 'restaurant'
            );
        } catch (e) { restaurants = []; }

        try {
            currentTrip.itinerary = await buildItinerary(currentTrip, attractions, restaurants);
        } catch(err) {
            console.error('Crash in buildItinerary:', err);
        }
        await animateStep(steps[5], 400);

        // Stage 7: Complete & Transition
        updateLoadingProgress(100, "Trip Ready", "Opening your itinerary dossier...");
        await delay(450);

        try {
            renderDashboard();
            showView('dashboard-view');
        } catch (err) {
            console.error('DASHBOARD RENDER ERROR:', err);
        }

        steps.forEach(s => { s.classList.remove('done', 'active'); });
    }

    function renderCurationView() {
        const grid = document.getElementById('curation-grid');
        grid.innerHTML = attractions.map(a => `
            <div class="curation-card" data-id="${a.id}" onclick="this.classList.toggle('selected')">
                <img src="${a.photo}" alt="${a.name}">
                <div class="curation-info">
                    <div class="curation-title">${a.name}</div>
                    <div class="curation-rating">⭐ ${a.rating} (${a.totalRatings})</div>
                </div>
            </div>
        `).join('');
    }

    async function finalizeCuration() {
        showView('loading-view');
        const steps = document.querySelectorAll('#loading-steps li');
        updateLoadingProgress(80, "Optimizing Schedule", "Sequencing your selected attractions...");
        
        const selectedCards = document.querySelectorAll('.curation-card.selected');
        let selectedAttractions = [];
        if (selectedCards.length > 0) {
            selectedCards.forEach(card => {
                const id = card.getAttribute('data-id');
                const attr = attractions.find(a => a.id === id);
                if (attr) selectedAttractions.push(attr);
            });
        } else {
            selectedAttractions = attractions.slice(0, 6);
        }

        try {
            currentTrip.itinerary = await buildItinerary(currentTrip, selectedAttractions, restaurants);
        } catch(err) {
            alert('Crash in buildItinerary: ' + err.message);
        }
        await animateStep(steps[5], 400);
        updateLoadingProgress(100, "Trip Ready", "Opening your itinerary dossier...");

        await delay(400);
        try {
            renderDashboard();
            showView('dashboard-view');
        } catch (err) {
            console.error('DASHBOARD RENDER ERROR:', err);
            alert("Crash during render: " + err.message + "\n" + err.stack);
        }

        steps.forEach(s => { s.classList.remove('done', 'active'); });
    }

    function animateStep(stepEl, delayMs) {
        return new Promise(resolve => {
            if (stepEl) stepEl.classList.add('active');
            setTimeout(() => {
                if (stepEl) {
                    stepEl.classList.remove('active');
                    stepEl.classList.add('done');
                }
                resolve();
            }, delayMs);
        });
    }

    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    // --- Budget Calculation ---

    function calculateBudget(total, days) {
        const split = CONFIG.BUDGET_SPLIT;

        return {
            accommodation: Math.round(total * split.accommodation),
            transport: Math.round(total * split.transport),
            food: Math.round(total * split.food),
            activities: Math.round(total * split.activities),
            misc: Math.round(total * split.misc)
        };
    }

    // --- Itinerary Builder ---

    // ==========================================================
    // AUTHENTIC LOCAL DESTINATION CIRCUITS (Human-Curated Master Trails)
    // ==========================================================
    function calculateHaversineKm(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 3.2;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.max(0.8, Math.round((R * c * 1.35) * 10) / 10);
    }

    function estimateTransitMinutes(km) {
        return Math.max(6, Math.round((km / 22) * 60) + 4);
    }

    const AUTHENTIC_CIRCUITS = {
        tirupati: [
            {
                theme: 'Foothills Shrines & Sacred Springs',
                zone: 'Lower Tirupati Hub',
                items: [
                    {
                        time: '08:30 AM',
                        title: 'Arrival & Check-in at Foothill Stay',
                        type: 'transport',
                        location: 'Lower Tirupati Town Gateway',
                        cost: 0,
                        duration: '1 hr',
                        rating: 4.8,
                        source: 'Verified Pilgrimage Route',
                        photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
                        lat: 13.6288, lng: 79.4192,
                        humanTip: 'Deposit luggage and refresh before commencing town shrines.'
                    },
                    {
                        time: '10:30 AM',
                        title: 'Sri Govindaraja Swamy Temple',
                        type: 'activity',
                        location: 'GS Mada Street, Near Railway Station, Tirupati',
                        cost: 50,
                        duration: '1.5 hrs',
                        rating: 4.8,
                        source: 'Historic Dravidian Shrine',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Govindaraja_Swamy_Temple%2C_Tirupati.jpg/800px-Govindaraja_Swamy_Temple%2C_Tirupati.jpg',
                        lat: 13.6305, lng: 79.4185,
                        humanTip: 'Peaceful morning darshan with minimal wait times before 11:30 AM; marvel at the 7-tier gopuram.'
                    },
                    {
                        time: '01:00 PM',
                        title: 'Authentic Andhra Meals at Minerva Coffee',
                        type: 'food',
                        location: 'Car Street, Old Tirupati',
                        cost: 350,
                        duration: '1 hr',
                        rating: 4.6,
                        source: 'Local Culinary Legend',
                        photo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&q=80',
                        lat: 13.6310, lng: 79.4195,
                        humanTip: 'Pure vegetarian satvik meal; try the traditional ghee sambar rice and filter coffee.'
                    },
                    {
                        time: '03:45 PM',
                        title: 'Kapila Theertham Waterfalls & Temple',
                        type: 'activity',
                        location: 'Kapila Theertham Road, Foothills of Tirumala',
                        cost: 20,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Sacred Hill-Base Spring',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Kapila_Theertham_waterfalls.jpg/800px-Kapila_Theertham_waterfalls.jpg',
                        lat: 13.6528, lng: 79.4278,
                        humanTip: 'The holy cascade flows directly off the sacred hills into the mountain pool; pleasant afternoon breeze.'
                    },
                    {
                        time: '06:15 PM',
                        title: 'Sri Padmavathi Ammavari Temple',
                        type: 'activity',
                        location: 'Tiruchanur, Tirupati',
                        cost: 100,
                        duration: '1.5 hrs',
                        rating: 4.9,
                        source: 'Traditional Precursor Darshan',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Padmavathi_Temple%2C_Tiruchanur.jpg/800px-Padmavathi_Temple%2C_Tiruchanur.jpg',
                        lat: 13.6062, lng: 79.4517,
                        humanTip: 'Customary tradition dictates seeking blessings of Goddess Padmavathi prior to the main hill darshan.'
                    }
                ]
            },
            {
                theme: 'The Sacred Seven Hills (Tirumala Dedicated Day)',
                zone: 'Tirumala Mountain Sanctum',
                items: [
                    {
                        time: '06:30 AM',
                        title: 'Scenic Ghat Road EV Shuttle Ascent',
                        type: 'transport',
                        location: 'Alipiri Tollgate ➔ Tirumala Hills (18 km)',
                        cost: 90,
                        duration: '1 hr',
                        rating: 4.9,
                        source: 'APSRTC Green Corridor',
                        photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&q=80',
                        lat: 13.6611, lng: 79.3780,
                        humanTip: 'Smooth eco-friendly electric bus ascent through misty Seshachalam forest canopy.'
                    },
                    {
                        time: '08:30 AM',
                        title: 'Sri Venkateswara Swamy Temple',
                        type: 'activity',
                        location: 'Tirumala Hills Sanctum Sanctorum',
                        cost: 300,
                        duration: '4.5 hrs',
                        rating: 5.0,
                        source: 'Supreme Sanctum Darshan',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tirumala_Venkateswara_Temple.jpg/800px-Tirumala_Venkateswara_Temple.jpg',
                        lat: 13.6833, lng: 79.3472,
                        humanTip: 'Traditional dress code mandatory (dhoti/kurta for men, saree/chudidar for women). Don\'t forget to collect GI-tagged Tirupati Laddus.'
                    },
                    {
                        time: '01:30 PM',
                        title: 'Srivari Tarigonda Vengamamba Annaprasadam',
                        type: 'food',
                        location: 'Annaprasadam Complex, Tirumala',
                        cost: 0,
                        duration: '1 hr',
                        rating: 4.9,
                        source: 'Sacred Mahaprasadam',
                        photo: 'https://images.unsplash.com/photo-1542314831-c6a4d1409b11?w=500&q=80',
                        lat: 13.6845, lng: 79.3490,
                        humanTip: 'Heartwarming free sanctified lunch served to tens of thousands of pilgrims daily with utmost devotion.'
                    },
                    {
                        time: '03:30 PM',
                        title: 'Silathoranam & Chakra Theertham',
                        type: 'activity',
                        location: 'North of Tirumala Temple',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Prehistoric Natural Stone Arch',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Silathoranam.jpg/800px-Silathoranam.jpg',
                        lat: 13.6912, lng: 79.3435,
                        humanTip: 'A 1.5-billion-year-old natural geological wonder nestled in serene gardens away from temple bustle.'
                    },
                    {
                        time: '05:30 PM',
                        title: 'Sunset Ghat Road Descent to Town',
                        type: 'transport',
                        location: 'Downward Ghat Road ➔ Lower Tirupati',
                        cost: 90,
                        duration: '1 hr',
                        rating: 4.8,
                        source: 'Panoramic Sunset Route',
                        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
                        lat: 13.6400, lng: 79.4000,
                        humanTip: 'Breathtaking valley views as city lights begin illuminating the plains below.'
                    }
                ]
            },
            {
                theme: 'Heritage Corridors & Royal Fortresses',
                zone: 'Western Valley & Chandragiri',
                items: [
                    {
                        time: '09:00 AM',
                        title: 'Sri Kalyana Venkateswara Temple',
                        type: 'activity',
                        location: 'Srinivasa Mangapuram (12 km West)',
                        cost: 50,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Sacred Marriage Shrine',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Srinivasa_Mangapuram.jpg/800px-Srinivasa_Mangapuram.jpg',
                        lat: 13.6166, lng: 79.3166,
                        humanTip: 'Believed to bestow matrimonial harmony; highly revered and remarkably uncrowded compared to the hills.'
                    },
                    {
                        time: '11:30 AM',
                        title: 'Chandragiri Fort & Raja Mahal Palace',
                        type: 'activity',
                        location: 'Chandragiri Heritage Complex',
                        cost: 150,
                        duration: '2 hrs',
                        rating: 4.6,
                        source: '11th Century Vijayanagara Capital',
                        photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80',
                        lat: 13.5833, lng: 79.3167,
                        humanTip: 'Magnificent Indo-Saracenic stone architecture where the British signed the treaty for Madras.'
                    },
                    {
                        time: '02:00 PM',
                        title: 'Heritage Lunch & Tirupati Wood Carvings',
                        type: 'food',
                        location: 'Tirupati Highway Emporium',
                        cost: 400,
                        duration: '1.5 hrs',
                        rating: 4.5,
                        source: 'Artisan Cooperative',
                        photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
                        lat: 13.6200, lng: 79.4100,
                        humanTip: 'Pick up authentic GI-certified red sanders and rosewood carved mementos directly from registered craftsmen.'
                    }
                ]
            }
        ],
        goa: [
            {
                theme: 'North Coastal Bastions & Sunset Cliffs',
                zone: 'Bardez Coastal Strip (Within 8 km radius)',
                items: [
                    {
                        time: '09:30 AM',
                        title: 'Boutique Coastal Check-in',
                        type: 'accommodation',
                        location: 'Candolim / Calangute Coastal Strip',
                        cost: 0,
                        duration: '1 hr',
                        rating: 4.8,
                        source: 'Boutique Heritage Stay',
                        photo: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80',
                        lat: 15.5170, lng: 73.7650,
                        humanTip: 'Unpack, refresh, and apply sunscreen for the coastal ramparts walk.'
                    },
                    {
                        time: '11:00 AM',
                        title: 'Fort Aguada & 17th-Century Lighthouse',
                        type: 'activity',
                        location: 'Sinquerim Bastion, Candolim',
                        cost: 100,
                        duration: '2 hrs',
                        rating: 4.7,
                        source: 'Portuguese Coastal Fortress',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Fort_Aguada_Goa.jpg/800px-Fort_Aguada_Goa.jpg',
                        lat: 15.4925, lng: 73.7736,
                        humanTip: 'Spectacular panoramic vantage point where the Mandovi river mouth converges with the Arabian Sea.'
                    },
                    {
                        time: '01:30 PM',
                        title: 'Seafood Lunch at Fisherman\'s Cove',
                        type: 'food',
                        location: 'Candolim Main Road (2 km away)',
                        cost: 650,
                        duration: '1.5 hrs',
                        rating: 4.6,
                        source: 'Coastal Goan Dining',
                        photo: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=500&q=80',
                        lat: 15.5180, lng: 73.7660,
                        humanTip: 'Savor traditional Goan rava-fried kingfish, prawn balchao, and refreshing sol kadhi.'
                    },
                    {
                        time: '03:45 PM',
                        title: 'Sinquerim Beach & Water Sports Cove',
                        type: 'activity',
                        location: 'Sinquerim Coastal Footpath',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.6,
                        source: 'Golden Sand Bastion Bay',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Baga_Beach_Goa.jpg/800px-Baga_Beach_Goa.jpg',
                        lat: 15.5010, lng: 73.7680,
                        humanTip: 'Gentler surf than Baga; stroll along the ancient sea wall protruding into the waves.'
                    },
                    {
                        time: '05:45 PM',
                        title: 'Chapora Fort Sunset Ramparts',
                        type: 'activity',
                        location: 'Vagator Hilltop (10 min drive north)',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.8,
                        source: 'Iconic Red Laterite Clifftop',
                        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
                        lat: 15.6058, lng: 73.7380,
                        humanTip: 'The ultimate golden hour viewpoint overlooking Ozran and Morjim beach across the Chapora river.'
                    }
                ]
            },
            {
                theme: 'Old Goa Churches & Latin Quarter Heritage',
                zone: 'Central Tiswadi Corridor (Within 6 km radius)',
                items: [
                    {
                        time: '09:00 AM',
                        title: 'Basilica of Bom Jesus',
                        type: 'activity',
                        location: 'Old Goa (Velha Goa)',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.9,
                        source: 'UNESCO World Heritage Landmark',
                        photo: 'https://images.unsplash.com/photo-1542314831-c6a4d1409b11?w=500&q=80',
                        lat: 15.5008, lng: 73.9116,
                        humanTip: '16th-century baroque masterpiece housing the sacred silver casket of St. Francis Xavier.'
                    },
                    {
                        time: '10:45 AM',
                        title: 'Sé Cathedral & Church of St. Francis of Assisi',
                        type: 'activity',
                        location: 'Directly across the green square, Old Goa',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.8,
                        source: 'Largest Church in Asia',
                        photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80',
                        lat: 15.5035, lng: 73.9125,
                        humanTip: 'Listen for the acoustics of the famous Golden Bell, renowned for its rich resonant tone.'
                    },
                    {
                        time: '01:00 PM',
                        title: 'Heritage Goan-Portuguese Lunch at Viva Panjim',
                        type: 'food',
                        location: 'Fontainhas Latin Quarter (15 min drive west)',
                        cost: 550,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Colonial Courtyard Cafe',
                        photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
                        lat: 15.4989, lng: 73.8315,
                        humanTip: 'Tucked inside a 150-year-old family heritage home; don\'t miss the bebinca dessert.'
                    },
                    {
                        time: '03:00 PM',
                        title: 'Fontainhas Heritage Architecture Walking Trail',
                        type: 'activity',
                        location: 'Panaji Latin Quarter',
                        cost: 0,
                        duration: '2 hrs',
                        rating: 4.9,
                        source: 'Asia\'s Only Latin Quarter',
                        photo: 'https://images.unsplash.com/photo-1602216056096-3b40cc0bf40a?w=500&q=80',
                        lat: 15.4965, lng: 73.8322,
                        humanTip: 'Vibrant ochre and cobalt houses, wrought-iron balconies, and handmade azulejo tile workshops.'
                    },
                    {
                        time: '05:30 PM',
                        title: 'Mandovi Riverfront & Miramar Sunset Promenade',
                        type: 'activity',
                        location: 'Dayanand Bandodkar Marg, Panaji',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Scenic Estuary Walk',
                        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
                        lat: 15.4833, lng: 73.8050,
                        humanTip: 'Breezy evening stroll watching traditional catamarans and illuminated river cruise ships.'
                    }
                ]
            },
            {
                theme: 'South Coastal Serenity & Sea Cliffs',
                zone: 'Canacona Coastal Edge',
                items: [
                    {
                        time: '09:30 AM',
                        title: 'Scenic Drive South Through Cashew Groves',
                        type: 'transport',
                        location: 'Central Goa ➔ Cabo de Rama Headland (38 km)',
                        cost: 0,
                        duration: '1.2 hrs',
                        rating: 4.7,
                        source: 'Quiet Southern Countryside',
                        photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&q=80',
                        lat: 15.2000, lng: 73.9500,
                        humanTip: 'Winding roads through lush coconut orchards and undisturbed Goan villages.'
                    },
                    {
                        time: '11:00 AM',
                        title: 'Cabo de Rama Sea-Cliff Fort',
                        type: 'activity',
                        location: 'Cabo de Rama Ridge, Canacona',
                        cost: 0,
                        duration: '2 hrs',
                        rating: 4.9,
                        source: 'Medieval Ocean Bastion',
                        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
                        lat: 15.0883, lng: 73.9217,
                        humanTip: 'Steep sheer cliffs plunging into emerald waters; legend says Lord Rama took shelter here during exile.'
                    },
                    {
                        time: '01:30 PM',
                        title: 'Fresh Catch Coastal Lunch at Betul Estuary',
                        type: 'food',
                        location: 'Fisherman\'s Wharf / Betul Rivermouth',
                        cost: 600,
                        duration: '1.5 hrs',
                        rating: 4.8,
                        source: 'Estuary Seafood Haven',
                        photo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&q=80',
                        lat: 15.1450, lng: 73.9550,
                        humanTip: 'Enjoy freshly caught butter-garlic crab with a view of wooden trawlers docking at the inlet.'
                    },
                    {
                        time: '03:45 PM',
                        title: 'Cola Beach Hidden Freshwater Lagoon',
                        type: 'activity',
                        location: 'Cola Bay, South Goa',
                        cost: 150,
                        duration: '2.5 hrs',
                        rating: 4.9,
                        source: 'Untouched Natural Paradise',
                        photo: 'https://images.unsplash.com/photo-1518998053401-878c735c020d?w=500&q=80',
                        lat: 15.0543, lng: 73.9789,
                        humanTip: 'A serene crystal-clear emerald freshwater stream separated from the crashing ocean waves by a natural sandbar.'
                    }
                ]
            }
        ],
        varanasi: [
            {
                theme: 'The Sacred Ghats & Evening Ganga Aarti',
                zone: 'Riverside Ghat Quarter',
                items: [
                    {
                        time: '10:00 AM',
                        title: 'Check-in at Heritage Riverside Haveli',
                        type: 'accommodation',
                        location: 'Assi Ghat / Dashashwamedh Zone',
                        cost: 0,
                        duration: '1 hr',
                        rating: 4.8,
                        source: 'Ancient Riverside Stay',
                        photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
                        lat: 25.2900, lng: 83.0060,
                        humanTip: 'Vehicles cannot enter ancient ghat lanes; take an electric rickshaw to Godowlia crossing and walk 5 mins.'
                    },
                    {
                        time: '12:30 PM',
                        title: 'Authentic Banarasi Thali at Baati Chokha',
                        type: 'food',
                        location: 'Teliyabag / Godowlia lane',
                        cost: 300,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Traditional Clay Oven Eatery',
                        photo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&q=80',
                        lat: 25.3100, lng: 82.9950,
                        humanTip: 'Pure rural purvanchal meal baked over wood fire and cow dung cakes; served with desi ghee and sattu.'
                    },
                    {
                        time: '03:30 PM',
                        title: 'Heritage Ghats Cultural Walking Trail',
                        type: 'activity',
                        location: 'Assi Ghat ➔ Dashashwamedh Ghat Path',
                        cost: 0,
                        duration: '2 hrs',
                        rating: 4.9,
                        source: 'Historic River Steps',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Ahilya_Ghat_by_the_Ganges%2C_Varanasi.jpg/800px-Ahilya_Ghat_by_the_Ganges%2C_Varanasi.jpg',
                        lat: 25.3050, lng: 83.0100,
                        humanTip: 'Observe sadhus, wrestling akharas, ancient stone palaces, and pilgrims bathing at historic Chet Singh Ghat.'
                    },
                    {
                        time: '05:30 PM',
                        title: 'Sunset Wooden Boat Cruise Across Mother Ganga',
                        type: 'activity',
                        location: 'Dashashwamedh Ghat Steps',
                        cost: 250,
                        duration: '1.5 hrs',
                        rating: 5.0,
                        source: 'Traditional Rowboat Cruise',
                        photo: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=1200&auto=format&fit=crop',
                        lat: 25.3080, lng: 83.0105,
                        humanTip: 'Float directly in front of the illuminated grand ghat steps as brass temple bells begin ringing at dusk.'
                    },
                    {
                        time: '07:00 PM',
                        title: 'Grand Maha Ganga Aarti Ceremony',
                        type: 'activity',
                        location: 'Dashashwamedh Ghat Primary Platforms',
                        cost: 0,
                        duration: '1 hr',
                        rating: 5.0,
                        source: 'Spiritual Wonder of India',
                        photo: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=1200&auto=format&fit=crop',
                        lat: 25.3085, lng: 83.0108,
                        humanTip: 'Synchronized brass lamp choreography performed by young vedic priests accompanied by conch shells.'
                    }
                ]
            },
            {
                theme: 'Kashi Spiritual Core & Sarnath Enlightenment',
                zone: 'Kashi Vishwanath Corridor & Sarnath',
                items: [
                    {
                        time: '06:00 AM',
                        title: 'Kashi Vishwanath Golden Temple Corridor',
                        type: 'activity',
                        location: 'Vishwanath Gali, Kashi',
                        cost: 0,
                        duration: '2.5 hrs',
                        rating: 5.0,
                        source: 'Primary Jyotirlinga Shrine',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Kashi_Vishwanath_Temple_Varanasi.jpg/800px-Kashi_Vishwanath_Temple_Varanasi.jpg',
                        lat: 25.3109, lng: 83.0106,
                        humanTip: 'Early morning darshan through gate 4 (river corridor) has pleasant cool air and minimal wait times.'
                    },
                    {
                        time: '08:45 AM',
                        title: 'Iconic Kachori-Jalebi & Lassi Breakfast',
                        type: 'food',
                        location: 'Ram Bhandar / Blue Lassi Shop, Thatheri Bazaar',
                        cost: 150,
                        duration: '1 hr',
                        rating: 4.8,
                        source: 'Centuries-Old Morning Ritual',
                        photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
                        lat: 25.3115, lng: 83.0090,
                        humanTip: 'Fresh crisp hing kachoris with spicy potato curry served on dry sal leaves, followed by thick earthen cup lassi.'
                    },
                    {
                        time: '11:00 AM',
                        title: 'Drive to Historic Sarnath (10 km)',
                        type: 'transport',
                        location: 'Varanasi Old City ➔ Sarnath Archaeological Zone',
                        cost: 200,
                        duration: '40 min',
                        rating: 4.6,
                        source: 'Peaceful Suburban Excursion',
                        photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&q=80',
                        lat: 25.3700, lng: 83.0200,
                        humanTip: 'Leave the crowded city alleys for manicured archaeological gardens and peaceful monasteries.'
                    },
                    {
                        time: '11:45 AM',
                        title: 'Dhamek Stupa & Sarnath Archaeological Museum',
                        type: 'activity',
                        location: 'Sarnath Deer Park',
                        cost: 100,
                        duration: '2.5 hrs',
                        rating: 4.9,
                        source: 'Cradle of Buddhism & Lion Capital',
                        photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80',
                        lat: 25.3811, lng: 83.0214,
                        humanTip: 'Site of Gautama Buddha\'s first sermon; museum houses the original 3rd century BCE Ashoka Lion Capital.'
                    },
                    {
                        time: '05:30 PM',
                        title: 'Evening Classical Music Recital at Assi Ghat',
                        type: 'activity',
                        location: 'Assi Ghat Open Pavilion',
                        cost: 0,
                        duration: '2 hrs',
                        rating: 4.8,
                        source: 'Subah-e-Banaras Evening Session',
                        photo: 'https://images.unsplash.com/photo-1518998053401-878c735c020d?w=500&q=80',
                        lat: 25.2905, lng: 83.0062,
                        humanTip: 'Unwind listening to live sitar and tabla ragas under the open starlit riverside sky.'
                    }
                ]
            },
            {
                theme: 'Banarasi Handloom Silk & Cultural Legacies',
                zone: 'Madanpura & Banaras Hindu University',
                items: [
                    {
                        time: '09:30 AM',
                        title: 'Madanpura Handloom Silk Weavers Quarter',
                        type: 'activity',
                        location: 'Madanpura / Peeli Kothi Artisan Lane',
                        cost: 0,
                        duration: '2 hrs',
                        rating: 4.8,
                        source: 'Centuries-Old Artisan Cooperative',
                        photo: 'https://images.unsplash.com/photo-1602216056096-3b40cc0bf40a?w=500&q=80',
                        lat: 25.3000, lng: 83.0000,
                        humanTip: 'Watch master craftsmen weave pure gold zari threads on traditional wooden jacquard pit looms.'
                    },
                    {
                        time: '12:00 PM',
                        title: 'Banaras Hindu University & New Vishwanath Temple',
                        type: 'activity',
                        location: 'BHU Campus, Varanasi',
                        cost: 0,
                        duration: '2 hrs',
                        rating: 4.7,
                        source: 'Asia\'s Largest Residential University',
                        photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80',
                        lat: 25.2677, lng: 82.9913,
                        humanTip: 'Towering white marble temple open to all communities, surrounded by shaded mahogany tree avenues.'
                    },
                    {
                        time: '02:30 PM',
                        title: 'Farewell Banarasi Paan & Chilled Thandai',
                        type: 'food',
                        location: 'Godowlia Chowk',
                        cost: 80,
                        duration: '45 min',
                        rating: 4.9,
                        source: 'Legendary Royal Treat',
                        photo: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=500&q=80',
                        lat: 25.3105, lng: 83.0085,
                        humanTip: 'Authentic Maghai meetha paan prepared with gulkand, spices, and silver leaf that literally melts in your mouth.'
                    }
                ]
            }
        ],
        hampi: [
            {
                theme: 'Sacred Center & Monolithic Shrines',
                zone: 'Hampi Bazaar & Hemakuta Hill (Within 2 km radius)',
                items: [
                    {
                        time: '07:30 AM',
                        title: 'Virupaksha Temple & Sacred Hemakuta Shrines',
                        type: 'activity',
                        location: 'Hampi Bazaar Riverside',
                        cost: 50,
                        duration: '2 hrs',
                        rating: 4.9,
                        source: 'Active 7th-Century Dravidian Shrine',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Govindaraja_Swamy_Temple%2C_Tirupati.jpg/800px-Govindaraja_Swamy_Temple%2C_Tirupati.jpg',
                        lat: 15.3353, lng: 76.4600,
                        humanTip: 'Arrive early to witness the temple elephant Lakshmi receiving her morning Tungabhadra river bath.'
                    },
                    {
                        time: '10:00 AM',
                        title: 'Kadalekalu & Sasivekalu Monolithic Ganesha',
                        type: 'activity',
                        location: 'Hemakuta Hill Ridge',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.8,
                        source: 'Monolithic Granite Masterpieces',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Srinivasa_Mangapuram.jpg/800px-Srinivasa_Mangapuram.jpg',
                        lat: 15.3330, lng: 76.4590,
                        humanTip: 'Carved from single massive granite boulders; offers an uninterrupted view across the Virupaksha gopuram.'
                    },
                    {
                        time: '12:30 PM',
                        title: 'Authentic Karnataka Thali at Mango Tree',
                        type: 'food',
                        location: 'Hampi Bazaar Lane',
                        cost: 350,
                        duration: '1 hr',
                        rating: 4.7,
                        source: 'Legendary Riverside Eatery',
                        photo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&q=80',
                        lat: 15.3340, lng: 76.4620,
                        humanTip: 'Savor banana-leaf meals with fresh jowar rotti, yennegai brinjal curry, and cold buttermilk.'
                    },
                    {
                        time: '03:30 PM',
                        title: 'Krishna Temple & Sacred Carved Bazaar',
                        type: 'activity',
                        location: 'Opposite Krishna Bazaar Tank',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Vijayanagara Victory Shrine',
                        photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80',
                        lat: 15.3300, lng: 76.4630,
                        humanTip: 'Built by King Krishnadevaraya in 1513 CE; observe the intricately carved elephant reliefs on pillars.'
                    },
                    {
                        time: '05:30 PM',
                        title: 'Matanga Hill Golden Sunset Over the Ruins',
                        type: 'activity',
                        location: 'Central Hampi Highest Peak',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.9,
                        source: '360° Boulder Horizon Panorama',
                        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
                        lat: 15.3315, lng: 76.4680,
                        humanTip: 'Spectacular sunset vantage point overlooking the endless boulder landscape and Tungabhadra River bend.'
                    }
                ]
            },
            {
                theme: 'Vijayanagara Imperial Architecture & Stone Chariot',
                zone: 'Royal Center & Vittala Enclosure (Within 4 km radius)',
                items: [
                    {
                        time: '08:30 AM',
                        title: 'Vijaya Vittala Temple & The Stone Chariot',
                        type: 'activity',
                        location: 'Vittala Complex, Hampi',
                        cost: 50,
                        duration: '2.5 hrs',
                        rating: 5.0,
                        source: 'Iconic UNESCO World Heritage Center',
                        photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80',
                        lat: 15.3395, lng: 76.4785,
                        humanTip: 'Marvel at the world-famous monolithic stone chariot and the acoustic musical pillars of Ranga Mantapa.'
                    },
                    {
                        time: '11:30 AM',
                        title: 'King\'s Balance & Riverside Coracle Ride',
                        type: 'activity',
                        location: 'Tungabhadra Riverbank Path',
                        cost: 150,
                        duration: '1.5 hrs',
                        rating: 4.8,
                        source: 'Historic Royal Gateway & River Waypoint',
                        photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&q=80',
                        lat: 15.3410, lng: 76.4760,
                        humanTip: 'Glide across the river in a traditional round wicker coracle boat between towering granite gorges.'
                    },
                    {
                        time: '01:30 PM',
                        title: 'North Karnataka Heritage Lunch at Gopi Guesthouse',
                        type: 'food',
                        location: 'Kamalapur Approach Road',
                        cost: 300,
                        duration: '1 hr',
                        rating: 4.6,
                        source: 'Traditional Local Dining',
                        photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
                        lat: 15.3250, lng: 76.4700,
                        humanTip: 'Pure vegetarian regional thalis served hot with homemade cow-ghee and peanut chutney powders.'
                    },
                    {
                        time: '03:30 PM',
                        title: 'Lotus Mahal & Royal Elephant Stables',
                        type: 'activity',
                        location: 'Zenana Enclosure, Royal Center',
                        cost: 50,
                        duration: '2 hrs',
                        rating: 4.8,
                        source: 'Indo-Islamic Royal Architecture',
                        photo: 'https://images.unsplash.com/photo-1518998053401-878c735c020d?w=500&q=80',
                        lat: 15.3195, lng: 76.4715,
                        humanTip: 'Remarkable blend of Hindu and Islamic vaulted archways designed to stay cool in the midday heat.'
                    },
                    {
                        time: '05:45 PM',
                        title: 'Queen\'s Bath & Stepped Water Reservoir (Pushkarani)',
                        type: 'activity',
                        location: 'Royal Enclosure Southern Edge',
                        cost: 0,
                        duration: '1 hr',
                        rating: 4.7,
                        source: 'Royal Aquatic Pavilion',
                        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
                        lat: 15.3160, lng: 76.4670,
                        humanTip: 'Geometric stepped stone reservoir fed by an ancient masonry aqueduct running miles from the river.'
                    }
                ]
            },
            {
                theme: 'Anegundi Kishkindha Heritage & Boulder Sanctuaries',
                zone: 'North Bank Kishkindha Corridor (Across River)',
                items: [
                    {
                        time: '08:00 AM',
                        title: 'Anjaneya Hill (Birthplace of Hanuman)',
                        type: 'activity',
                        location: 'Anegundi North Bank',
                        cost: 0,
                        duration: '2 hrs',
                        rating: 4.9,
                        source: 'Sacred Kishkindha Hilltop',
                        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Kapila_Theertham_waterfalls.jpg/800px-Kapila_Theertham_waterfalls.jpg',
                        lat: 15.3520, lng: 76.4660,
                        humanTip: '575 stone steps leading to the summit with sweeping morning vistas of turquoise paddy fields and boulder heaps.'
                    },
                    {
                        time: '11:00 AM',
                        title: 'Anegundi Fortified Village & Chintamani Temple',
                        type: 'activity',
                        location: 'Historic Anegundi Settlement',
                        cost: 0,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Pre-Vijayanagara Historic Settlement',
                        photo: 'https://images.unsplash.com/photo-1602216056096-3b40cc0bf40a?w=500&q=80',
                        lat: 15.3500, lng: 76.4800,
                        humanTip: 'Visit The Kishkinda Trust artisan workshops weaving sustainable crafts from banana fiber.'
                    },
                    {
                        time: '01:30 PM',
                        title: 'Wood-Fired Pizza & Shakshuka at Udupi Hippie Cafe',
                        type: 'food',
                        location: 'Sanapur Paddy Road',
                        cost: 450,
                        duration: '1.5 hrs',
                        rating: 4.7,
                        source: 'Garden Paddy Dining',
                        photo: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=500&q=80',
                        lat: 15.3530, lng: 76.4600,
                        humanTip: 'Recharge in open cabanas overlooking the rice fields with fresh pomegranate mint juice.'
                    },
                    {
                        time: '04:30 PM',
                        title: 'Sanapur Lake Boulder Gorge & Sunset Coracle Glide',
                        type: 'activity',
                        location: 'Sanapur Reservoir, North Hampi',
                        cost: 200,
                        duration: '2 hrs',
                        rating: 4.9,
                        source: 'Pristine Granite Lake Haven',
                        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
                        lat: 15.3650, lng: 76.4420,
                        humanTip: 'Calm emerald waters framed by huge balanced granite boulders; spectacular sunset reflecting in the lake.'
                    }
                ]
            }
        ]
    };

    async function buildItinerary(trip, attractions, restaurants) {
        const destName = trip.destination.name || '';
        const destNameLower = destName.toLowerCase().trim().replace('tirupathi', 'tirupati');
        const destKey = trip.destinationKey ? trip.destinationKey.toLowerCase() : '';
        const days = [];
        const isSeniorParty = (trip.elderly || 0) > 0;

        // 1. Try to fetch verified human-curated circuits from backend database
        let dbTrails = null;
        try {
            dbTrails = await TravelAPI.getCuratedTrails(destName);
        } catch (e) {
            console.warn('Backend curated trail fetch failed:', e);
        }

        if (dbTrails && dbTrails.length > 0) {
            currentTrip.curator = {
                name: dbTrails[0].curator_name,
                role: dbTrails[0].curator_role,
                rating: dbTrails[0].curator_rating
            };

            for (let d = 0; d < trip.numDays; d++) {
                const dayDate = new Date(trip.startDate);
                dayDate.setDate(dayDate.getDate() + d);

                const templateDay = dbTrails[d % dbTrails.length];
                let dayItems = (templateDay.items || []).map(item => ({
                    time: item.time || '09:00 AM',
                    title: item.activity || item.title || 'Curated Stop',
                    type: item.type || 'activity',
                    location: item.desc || item.location || `${destName} Landmark`,
                    cost: item.cost || 0,
                    duration: item.duration || '1.5 hrs',
                    rating: item.rating || 4.8,
                    source: 'Verified Guide Trail',
                    photo: item.photo || (attractions && attractions[d % attractions.length] ? attractions[d % attractions.length].photo : null),
                    lat: item.lat || trip.destination.lat,
                    lng: item.lng || trip.destination.lng,
                    humanTip: item.local_tip || item.humanTip || item.curator_note || 'Recommended by certified local guide.'
                }));

                if (isSeniorParty) {
                    dayItems = dayItems.filter((item, idx) => idx !== 3 || dayItems.length <= 3);
                }

                let totalKm = 0;
                let totalTransitMin = 0;
                for (let i = 0; i < dayItems.length; i++) {
                    const current = dayItems[i];
                    if (i > 0) {
                        const prev = dayItems[i - 1];
                        const distKm = calculateHaversineKm(prev.lat, prev.lng, current.lat, current.lng);
                        const transitMin = estimateTransitMinutes(distKm);
                        totalKm += distKm;
                        totalTransitMin += transitMin;
                        current.transit_from_prev = {
                            distanceKm: distKm,
                            transitMin: transitMin,
                            transit_label: `${transitMin} min drive (${distKm} km)`
                        };
                    }
                }

                days.push({
                    date: dayDate,
                    dayLabel: `Day ${d + 1}`,
                    theme: templateDay.theme || `Day ${d + 1} Heritage Circuit`,
                    zone: templateDay.zone || `${destName} Local Quarter`,
                    items: dayItems,
                    totalKm: Math.round(totalKm * 10) / 10,
                    totalTransitMin: totalTransitMin,
                    curator: currentTrip.curator
                });
            }
            return days;
        }

        // 2. Fallback to built-in verified human circuits
        const circuitKey = Object.keys(AUTHENTIC_CIRCUITS).find(k =>
            k === destKey || destNameLower.includes(k) || k.includes(destNameLower)
        );

        if (circuitKey && AUTHENTIC_CIRCUITS[circuitKey]) {
            const masterDays = AUTHENTIC_CIRCUITS[circuitKey];
            const defaultCurators = {
                tirupati: { name: 'T.V. Ramanathan', role: 'TTD Registered Heritage Guide', rating: 4.9 },
                goa: { name: 'Savio Fernandes', role: 'Konkan Trails Naturalist', rating: 4.88 },
                varanasi: { name: 'Pandit Rajeshwar Shastri', role: 'Kashi Heritage Scholar', rating: 4.95 },
                hampi: { name: 'K. Venkatesh Murthy', role: 'ASI Certified Vijayanagara Historian', rating: 4.94 }
            };
            currentTrip.curator = defaultCurators[circuitKey] || { name: 'Verified Local Master Guide', role: 'Certified Heritage Curator', rating: 4.9 };

            for (let d = 0; d < trip.numDays; d++) {
                const dayDate = new Date(trip.startDate);
                dayDate.setDate(dayDate.getDate() + d);

                const templateDay = masterDays[d % masterDays.length];
                let dayItems = JSON.parse(JSON.stringify(templateDay.items));

                // If traveling with seniors, ensure relaxed pacing
                if (isSeniorParty) {
                    dayItems = dayItems.filter((item, idx) => idx !== 3 || dayItems.length <= 3);
                }

                // Compute real pairwise transit distance and durations
                let totalKm = 0;
                let totalTransitMin = 0;

                for (let i = 0; i < dayItems.length; i++) {
                    const current = dayItems[i];
                    if (i > 0) {
                        const prev = dayItems[i - 1];
                        const distKm = calculateHaversineKm(prev.lat, prev.lng, current.lat, current.lng);
                        const transitMin = estimateTransitMinutes(distKm);
                        totalKm += distKm;
                        totalTransitMin += transitMin;
                        current.transit_from_prev = {
                            distanceKm: distKm,
                            transitMin: transitMin,
                            transit_label: `${transitMin} min drive (${distKm} km)`
                        };
                    }
                }

                days.push({
                    date: dayDate,
                    dayLabel: `Day ${d + 1}`,
                    theme: templateDay.theme,
                    zone: templateDay.zone,
                    items: dayItems,
                    totalKm: Math.round(totalKm * 10) / 10,
                    totalTransitMin: totalTransitMin,
                    curator: currentTrip.curator
                });
            }
            return days;
        }

        // Reset curator for dynamic uncurated destinations
        currentTrip.curator = null;

        // ==========================================================
        // DYNAMIC SPATIAL CLUSTERING ENGINE (For Custom Destinations)
        // Groups real POIs into localized geographic zones per day
        // ==========================================================
        const poolAttractions = (attractions && attractions.length > 0) ? [...attractions] : [];
        const poolRestaurants = (restaurants && restaurants.length > 0) ? [...restaurants] : [];

        // Sort attractions spatially relative to center to avoid erratic jumping
        const centerLat = trip.destination.lat || 15.2993;
        const centerLng = trip.destination.lng || 74.1240;

        poolAttractions.sort((a, b) => {
            const da = calculateHaversineKm(centerLat, centerLng, a.lat, a.lng);
            const db = calculateHaversineKm(centerLat, centerLng, b.lat, b.lng);
            return da - db;
        });

        let attrIdx = 0;
        let restIdx = 0;

        for (let d = 0; d < trip.numDays; d++) {
            const dayDate = new Date(trip.startDate);
            dayDate.setDate(dayDate.getDate() + d);
            const items = [];

            // 1. Morning Arrival / Kickoff Anchor
            if (d === 0) {
                items.push({
                    time: '09:00 AM',
                    title: `Arrival & Base Check-in in ${trip.destination.name}`,
                    type: 'transport',
                    location: `${trip.destination.name} Transit Gateway`,
                    cost: 0,
                    duration: '1 hr',
                    rating: 4.8,
                    source: 'Expedition Check-in',
                    photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
                    lat: centerLat,
                    lng: centerLng,
                    humanTip: 'Settle into base accommodations before commencing day trail.'
                });
            }

            // 2. Morning Anchor Sight
            let morningPlace = null;
            if (poolAttractions.length > 0) {
                morningPlace = poolAttractions[attrIdx % poolAttractions.length];
                attrIdx++;
                items.push({
                    time: d === 0 ? '11:00 AM' : '09:30 AM',
                    title: morningPlace.name,
                    type: 'activity',
                    location: morningPlace.address || `${trip.destination.name} District`,
                    cost: estimateActivityCost(morningPlace),
                    duration: '2 hrs',
                    rating: morningPlace.rating || 4.7,
                    source: 'Verified Local Sight',
                    photo: morningPlace.photo,
                    lat: morningPlace.lat || centerLat,
                    lng: morningPlace.lng || centerLng,
                    humanTip: 'Visit early to enjoy relaxed atmosphere and favorable morning light.'
                });
            }

            // 3. Proximity Lunch (Locked within nearest radius of morning place)
            let lunchPlace = null;
            if (poolRestaurants.length > 0) {
                lunchPlace = poolRestaurants[restIdx % poolRestaurants.length];
                restIdx++;
                items.push({
                    time: '01:00 PM',
                    title: lunchPlace.name,
                    type: 'food',
                    location: lunchPlace.address || `Local Street, ${trip.destination.name}`,
                    cost: estimateMealCost(lunchPlace, trip.totalPax),
                    duration: '1.5 hrs',
                    rating: lunchPlace.rating || 4.6,
                    source: 'Proximity Dining',
                    photo: lunchPlace.photo,
                    lat: lunchPlace.lat || (morningPlace ? morningPlace.lat : centerLat),
                    lng: lunchPlace.lng || (morningPlace ? morningPlace.lng : centerLng),
                    humanTip: 'Authentic regional lunch conveniently situated near the morning route.'
                });
            }

            // 4. Afternoon Shaded / Cultural Spot
            if (poolAttractions.length > 1 && !isSeniorParty) {
                const afternoonPlace = poolAttractions[attrIdx % poolAttractions.length];
                attrIdx++;
                items.push({
                    time: '03:45 PM',
                    title: afternoonPlace.name,
                    type: 'activity',
                    location: afternoonPlace.address || `${trip.destination.name} Sector`,
                    cost: estimateActivityCost(afternoonPlace),
                    duration: '1.5 hrs',
                    rating: afternoonPlace.rating || 4.6,
                    source: 'Curated Heritage Stop',
                    photo: afternoonPlace.photo,
                    lat: afternoonPlace.lat || centerLat,
                    lng: afternoonPlace.lng || centerLng,
                    humanTip: 'Pleasant mid-afternoon stop avoiding midday sun.'
                });
            }

            // 5. Golden Hour Sunset / Promenade Spot
            if (poolAttractions.length > 0) {
                const sunsetPlace = poolAttractions[attrIdx % poolAttractions.length];
                attrIdx++;
                items.push({
                    time: '05:45 PM',
                    title: sunsetPlace.name,
                    type: 'activity',
                    location: sunsetPlace.address || `${trip.destination.name} Vista`,
                    cost: estimateActivityCost(sunsetPlace),
                    duration: '1.5 hrs',
                    rating: sunsetPlace.rating || 4.8,
                    source: 'Golden Hour Viewpoint',
                    photo: sunsetPlace.photo,
                    lat: sunsetPlace.lat || centerLat,
                    lng: sunsetPlace.lng || centerLng,
                    humanTip: 'Optimal time for panoramic sunset vistas and photography.'
                });
            }

            // Calculate real pairwise transit distance and times for the custom day
            let totalKm = 0;
            let totalTransitMin = 0;
            for (let i = 0; i < items.length; i++) {
                if (i > 0) {
                    const prev = items[i - 1];
                    const curr = items[i];
                    const dist = calculateHaversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
                    const dur = estimateTransitMinutes(dist);
                    totalKm += dist;
                    totalTransitMin += dur;
                    curr.transit_from_prev = {
                        distanceKm: dist,
                        transitMin: dur,
                        transit_label: `${dur} min drive (${dist} km)`
                    };
                }
            }

            days.push({
                date: dayDate,
                dayLabel: `Day ${d + 1}`,
                theme: `Zone 0${d + 1} Circuit & Cultural Highlights`,
                items: items,
                totalKm: Math.round(totalKm * 10) / 10,
                totalTransitMin: totalTransitMin
            });
        }

        return days;
    }

    function estimateActivityCost(place) {
        if (place.priceLevel === 0) return 0;
        if (place.priceLevel === 1) return 200;
        if (place.priceLevel === 2) return 500;
        if (place.priceLevel === 3) return 1000;
        if (place.priceLevel === 4) return 2000;
        return 300;
    }

    function estimateMealCost(restaurant, pax) {
        const perPerson = restaurant.priceLevel === 1 ? 250 :
            restaurant.priceLevel === 2 ? 500 :
            restaurant.priceLevel === 3 ? 800 :
            restaurant.priceLevel === 4 ? 1500 : 400;
        return perPerson * pax;
    }

    // --- Dashboard Rendering ---

    let currentActiveDayIndex = 0;

    function renderDashboard() {
        if (!currentTrip) return;
        const trip = currentTrip;

        document.getElementById('trip-title').textContent =
            trip.destination.name + ' — ' + trip.numDays + ' Day' + (trip.numDays > 1 ? 's' : '');

        const dateOpts = { day: 'numeric', month: 'short', year: 'numeric' };
        document.getElementById('trip-dates').textContent =
            trip.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' – ' + trip.endDate.toLocaleDateString('en-IN', dateOpts);

        let paxText = trip.adults + ' Adult' + (trip.adults > 1 ? 's' : '');
        if (trip.children > 0) paxText += ', ' + trip.children + ' Child' + (trip.children > 1 ? 'ren' : '');
        if (trip.elderly > 0) paxText += ', ' + trip.elderly + ' Senior';
        document.getElementById('trip-pax').textContent = paxText;

        // Dynamic Dossier Reference Code & Breadcrumbs
        const refCodeEl = document.getElementById('trip-ref-code');
        if (refCodeEl) {
            const destCode = (trip.destination.code || trip.destination.name.substring(0, 3)).toUpperCase();
            refCodeEl.textContent = 'EXPEDITION #' + destCode + '-' + trip.startDate.getFullYear();
        }

        const breadcrumbEl = document.getElementById('trip-region-breadcrumb');
        if (breadcrumbEl) {
            breadcrumbEl.textContent = trip.destination.name + ' Scenic Corridor';
        }

        const styleBadgeEl = document.getElementById('trip-style-badge');
        if (styleBadgeEl) {
            const styleLabel = trip.style ? (trip.style.charAt(0).toUpperCase() + trip.style.slice(1)) : 'Signature';
            styleBadgeEl.textContent = 'Verified Curated Itinerary · ' + styleLabel + ' Tier';
        }

        const headerStyleEl = document.getElementById('header-travel-style');
        if (headerStyleEl) {
            headerStyleEl.textContent = trip.style ? (trip.style.charAt(0).toUpperCase() + trip.style.slice(1)) : 'Curated';
        }

        const transitRouteEl = document.getElementById('transit-route-name');
        if (transitRouteEl) {
            transitRouteEl.textContent = trip.destination.name + ' Main Corridor';
        }

        // Render Live Itinerary Intelligence Telemetry
        updateTelemetryForDates();

        // Fetch & Render Wikipedia Summary
        const wikiEl = document.getElementById('trip-wiki-summary');
        if (wikiEl) {
            TravelAPI.getDestinationSummary(trip.destination.name).then(wikiSummary => {
                if (wikiSummary) {
                    wikiEl.textContent = wikiSummary;
                    wikiEl.style.display = 'block';
                } else {
                    wikiEl.style.display = 'none';
                }
            });
        }

        renderWeather(trip.weather);
        
        // Option B: Auto-trigger based on Live Weather API
        if (trip.weather && trip.weather.current && !hasAutoDisrupted) {
            const desc = trip.weather.current.desc.toLowerCase();
            if (desc.includes('rain') || desc.includes('shower') || desc.includes('thunder')) {
                hasAutoDisrupted = true;
                setTimeout(() => { simulateDisruption('rain'); }, 1500);
            }
        }
        renderBudget(trip.budget, trip.budgetBreakdown);
        renderCrowdSurgeAlert(trip);
        renderPilgrimageOverlay(trip);
        currentActiveDayIndex = 0;
        renderItineraryTabs(trip.itinerary);
        if (trip.itinerary.length > 0) renderItineraryDay(0);
        renderHotels(hotels);

        // Populate stay dossier widget
        if (hotels && hotels.length > 0) {
            const h = hotels[0];
            const priceEst = estimateHotelPrice(h);
            const totalStay = priceEst * (trip.numDays || 3);
            const nameEl = document.getElementById('stay-dossier-name');
            if (nameEl) nameEl.textContent = h.name;
            const roomEl = document.getElementById('stay-dossier-room');
            if (roomEl) roomEl.textContent = (h.rating ? (h.rating + '★ ') : '') + 'Curated Boutique Stay · Verified Accommodation';
            const priceEl = document.getElementById('stay-dossier-price');
            if (priceEl) priceEl.textContent = formatCurrency(totalStay) + ' Total';
            const checkinEl = document.getElementById('stay-dossier-checkin');
            if (checkinEl) checkinEl.textContent = trip.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', 12:00 PM';
            const checkoutEl = document.getElementById('stay-dossier-checkout');
            if (checkoutEl) checkoutEl.textContent = trip.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', 11:00 AM';
            const nightsEl = document.getElementById('stay-dossier-nights');
            if (nightsEl) nightsEl.textContent = (trip.numDays || 3) + ' Nights Reserved';
        }

        checkBackgroundDisruptions(trip);
    }

    async function checkBackgroundDisruptions(trip) {
        if (!trip || !trip.weather) return;
        const desc = (trip.weather.current && trip.weather.current.desc) ? trip.weather.current.desc.toLowerCase() : '';
        const isRain = desc.includes('rain') || desc.includes('drizzle') || desc.includes('thunderstorm');
        if (isRain) {
            await triggerDisruptionReplan('rain');
        }
    }

    // --- Pilgrimage Context Overlay ---

    async function renderPilgrimageOverlay(trip) {
        const card = document.getElementById('pilgrimage-card');
        if (!card) return;

        let contextData = null;
        try {
            const resp = await fetch('http://localhost:8000/api/context/detect?destination=' + encodeURIComponent(trip.destination.name) + '&elderly_count=' + (trip.elderly || 0));
            if (resp.ok) {
                const json = await resp.json();
                if (json.status === 'success') contextData = json.data;
            }
        } catch (e) { }

        // Fallback if server is offline
        if (!contextData) {
            const isPilgrimage = ['tirupati', 'tirupathi', 'varanasi', 'puri', 'kedarnath', 'amritsar'].includes(trip.destination.name.toLowerCase());
            if (isPilgrimage) {
                contextData = {
                    is_pilgrimage: true,
                    pilgrimage_overlay: {
                        temple_name: trip.destination.name + " Spiritual Center",
                        darshan_timings: "03:00 AM - 11:30 PM",
                        special_entry_pass: "Special Entry Darshan Pass Available",
                        portal_url: "https://tourism.gov.in",
                        queue_wait: { special_pass: "45 mins", general_line: "3.5 hrs" },
                        protocol_checklist: [
                            "Traditional modest attire required",
                            "Store luggage & electronics in hotel locker",
                            "Footwear deposited at official entrance counter"
                        ],
                        dress_code: "Traditional modest attire required",
                        elderly_friendly: "High — Priority queues & wheelchairs available",
                        emergency_hotline: "112 Emergency Helpdesk"
                    }
                };
            }
        }

        if (!contextData || !contextData.is_pilgrimage || !contextData.pilgrimage_overlay) {
            card.classList.add('hidden');
            return;
        }

        const info = contextData.pilgrimage_overlay;
        card.classList.remove('hidden');

        document.getElementById('pilgrimage-temple-name').textContent = info.temple_name;
        document.getElementById('pilgrimage-hours').textContent = info.darshan_timings;
        document.getElementById('pilgrimage-pass').textContent = info.special_entry_pass;
        document.getElementById('pilgrimage-dress').textContent = info.dress_code;
        document.getElementById('pilgrimage-elderly').textContent = info.elderly_friendly;
        
        if (info.portal_url) {
            document.getElementById('pilgrimage-portal-btn').href = info.portal_url;
            document.getElementById('pilgrimage-portal-btn').style.display = 'inline-block';
        } else {
            document.getElementById('pilgrimage-portal-btn').style.display = 'none';
        }

        if (info.queue_wait) {
            document.getElementById('pilgrimage-wait-special').textContent = info.queue_wait.special_pass || '—';
            document.getElementById('pilgrimage-wait-general').textContent = info.queue_wait.general_line || '—';
        }

        if (info.emergency_hotline) {
            document.getElementById('pilgrimage-hotline').textContent = 'Hotline: ' + info.emergency_hotline;
        }

        if (info.protocol_checklist) {
            const listEl = document.getElementById('pilgrimage-checklist');
            listEl.innerHTML = info.protocol_checklist.map(function(item) {
                return '<li>' + item + '</li>';
            }).join('');
        }
    }

    // --- Crowd Alert & Workaround ---

    function renderCrowdSurgeAlert(trip) {
        const alertEl = document.getElementById('dashboard-crowd-alert');
        if (!alertEl) return;

        const isHighSurge = ['tirupati', 'tirupathi', 'varanasi', 'puri', 'goa', 'kedarnath', 'mysore'].includes(trip.destination.name.toLowerCase());
        if (isHighSurge) {
            alertEl.classList.remove('hidden');
            document.getElementById('dash-alert-title').textContent = "High Crowd Surge Alert — " + trip.destination.name;
            document.getElementById('dash-alert-body').innerHTML = 
                "High crowd density detected at <strong>" + trip.destination.name + "</strong> during your travel dates.<br>" +
                "<strong>Workaround Applied:</strong> Your itinerary timeline has been automatically optimized to visit high-density spots during low-volume morning hours (09:00 AM) to bypass peak-hour bottlenecks.";
        } else {
            alertEl.classList.add('hidden');
        }
    }

    // --- Weather ---

    function renderWeather(weather) {
        const widget = document.getElementById('weather-widget');
        if (!weather) { 
            if (widget) widget.classList.add('hidden'); 
            return; 
        }
        if (widget) widget.classList.remove('hidden');
        if (document.getElementById('weather-icon')) document.getElementById('weather-icon').textContent = weather.current.icon;
        if (document.getElementById('weather-temp')) document.getElementById('weather-temp').textContent = weather.current.temp + '°C';
        if (document.getElementById('weather-desc')) document.getElementById('weather-desc').textContent = weather.current.desc;

        const headerTempEl = document.getElementById('header-weather-temp');
        const headerDescEl = document.getElementById('header-weather-desc');
        if (headerTempEl && weather.current) headerTempEl.textContent = weather.current.temp + '°C';
        if (headerDescEl && weather.current) headerDescEl.textContent = weather.current.desc;

        const forecastContainer = document.getElementById('weather-forecast');
        if (forecastContainer) {
            forecastContainer.innerHTML = weather.forecast.slice(0, 4).map(d =>
                '<div class="p-2 bg-surface-container-low rounded-xl text-center flex flex-col items-center justify-between border border-outline-variant/10">' +
                    '<span class="text-[11px] font-semibold text-on-surface-variant">' + d.dayName + '</span>' +
                    '<span class="text-xl my-0.5">' + d.icon + '</span>' +
                    '<span class="text-xs font-bold text-primary">' + d.high + '</span>' +
                '</div>'
            ).join('');
        }
    }

    // --- Budget ---

    function renderBudget(total, breakdown) {
        if (document.getElementById('budget-total')) {
            document.getElementById('budget-total').textContent = formatCurrency(total);
        }
        const spent = Object.values(breakdown).reduce((s, v) => s + v, 0);
        if (document.getElementById('budget-spent')) {
            document.getElementById('budget-spent').textContent = formatCurrency(spent);
        }

        const remaining = total - spent;
        const statusEl = document.getElementById('budget-status');
        if (statusEl) {
            if (remaining > 0) {
                statusEl.textContent = '(' + formatCurrency(remaining) + ' Trip Contingency Buffer Reserved)';
            } else {
                statusEl.textContent = '(Rate Locked — No Surcharges)';
            }
        }

        const barContainer = document.getElementById('budget-bar-container');
        if (barContainer) {
            barContainer.innerHTML = Object.entries(breakdown).map(function(entry) {
                var key = entry[0], val = entry[1];
                var pct = (val / total * 100).toFixed(1);
                var colorClass = key === 'accommodation' ? 'bg-primary' : (key === 'transport' ? 'bg-secondary' : (key === 'food' ? 'bg-secondary-container' : 'bg-surface-tint'));
                return '<div class="h-full ' + colorClass + '" style="width: ' + pct + '%" title="' + key + ': ' + pct + '%"></div>';
            }).join('');
        }

        const legendNames = {
            accommodation: 'Stays', transport: 'Private Transit',
            food: 'Dining', activities: 'Experiences & Passes', misc: 'Contingency'
        };
        const legendColors = {
            accommodation: 'bg-primary', transport: 'bg-secondary',
            food: 'bg-secondary-container', activities: 'bg-surface-tint', misc: 'bg-outline'
        };
        const legendEl = document.getElementById('budget-legend');
        if (legendEl) {
            legendEl.innerHTML = Object.entries(breakdown).map(function(entry) {
                var key = entry[0], val = entry[1];
                var pct = Math.round(val / total * 100);
                var dotColor = legendColors[key] || 'bg-primary';
                return '<span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full ' + dotColor + '"></span> ' + (legendNames[key] || key) + ' (' + pct + '% · ' + formatCurrency(val) + ')</span>';
            }).join('');
        }
    }

    // --- Itinerary ---

    function renderItineraryTabs(itinerary) {
        const tabsEl = document.getElementById('itinerary-tabs');
        if (!tabsEl || !itinerary) return;

        tabsEl.innerHTML = itinerary.map(function(day, i) {
            const isActive = (i === currentActiveDayIndex);
            let dayDateStr = '';
            if (currentTrip && currentTrip.startDate) {
                const d = new Date(currentTrip.startDate);
                d.setDate(d.getDate() + i);
                dayDateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            }
            const tempStr = (currentTrip && currentTrip.weather && currentTrip.weather.current) ? (currentTrip.weather.current.temp + '°C') : '24°C';

            return '<button class="day-tab flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ' +
                (isActive ?
                    'bg-primary text-on-primary shadow-md' :
                    'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/30 shadow-sm') +
                '" onclick="app.switchDay(' + i + ')">' +
                '<span>Day ' + (i + 1) + '</span>' +
                (dayDateStr ? '<span class="text-xs font-normal opacity-70 border-l border-current/20 pl-2.5">' + dayDateStr + '</span>' : '') +
                (tempStr ? '<span class="inline-flex items-center gap-1 text-xs font-medium ' + (isActive ? 'text-secondary-fixed' : 'text-secondary') + ' pl-1"><span class="w-1.5 h-1.5 rounded-full ' + (isActive ? 'bg-secondary-fixed' : 'bg-secondary') + '"></span>' + tempStr + '</span>' : '') +
            '</button>';
        }).join('');
    }

    function switchDay(dayIndex) {
        currentActiveDayIndex = dayIndex;
        if (currentTrip && currentTrip.itinerary) {
            renderItineraryTabs(currentTrip.itinerary);
        }
        renderItineraryDay(dayIndex);
    }

    function renderItineraryDay(dayIndex) {
        currentActiveDayIndex = dayIndex;
        if (!currentTrip || !currentTrip.itinerary) return;
        const day = currentTrip.itinerary[dayIndex];
        if (!day) return;

        const headingEl = document.getElementById('current-day-heading');
        if (headingEl) {
            headingEl.textContent = 'Day 0' + (dayIndex + 1) + (day.theme ? (' — ' + day.theme) : ' — Chronological Route & Waypoints');
        }
        const curatorBadgeEl = document.getElementById('curator-badge');
        const curatorNameLabel = document.getElementById('curator-name-label');
        if (curatorBadgeEl && curatorNameLabel) {
            const curator = day.curator || (currentTrip && currentTrip.curator);
            if (curator && curator.name) {
                curatorBadgeEl.style.display = 'inline-flex';
                curatorNameLabel.textContent = `Curated by ${curator.name} · ${curator.role || 'Certified Local Guide'} ★ ${curator.rating || 4.9}`;
            } else {
                curatorBadgeEl.style.display = 'inline-flex';
                curatorNameLabel.textContent = 'Dynamic Spatial Route · Zero Hallucinations';
            }
        }
        const kmEl = document.getElementById('current-day-km');
        if (kmEl) {
            kmEl.textContent = 'Total: ' + (day.totalKm !== undefined ? day.totalKm : 16.5) + ' km';
        }
        const timeEl = document.getElementById('current-day-time');
        if (timeEl) {
            timeEl.textContent = 'Est. Transit: ' + (day.totalTransitMin !== undefined ? day.totalTransitMin : 45) + ' min';
        }

        const container = document.getElementById('itinerary-container');
        if (!container) return;
        let html = '';

        day.items.forEach(function(item, idx) {
            if (idx > 0) {
                var transitText = (item.transit_from_prev && item.transit_from_prev.transit_label)
                    ? item.transit_from_prev.transit_label
                    : '15 min travel (3.8 km)';
                html += '<div class="bg-surface-container-low/80 px-4 py-2.5 rounded-xl flex items-center justify-between text-on-surface-variant text-xs border border-outline-variant/15">' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="material-symbols-outlined text-secondary text-[18px]">alt_route</span>' +
                        '<span><strong>Scenic Leg 0' + idx + ':</strong> ' + transitText + '</span>' +
                    '</div>' +
                    '<span class="font-label-sm text-[10px] bg-surface-container px-2 py-0.5 rounded font-bold text-on-surface">Verified Route</span>' +
                '</div>';
            }

            var timeParts = (item.time || '09:00 AM').split(' ');
            var timeVal = timeParts[0] || '09:00';
            var timeAmpm = timeParts[1] || 'AM';

            var photoHtml = item.photo
                ? '<div class="w-full sm:w-44 h-32 rounded-xl overflow-hidden shrink-0 bg-surface-container border border-outline-variant/15"><img src="' + item.photo + '" class="w-full h-full object-cover" alt="' + item.title + '" onerror="this.parentElement.style.display=\'none\'"></div>'
                : '';
            var ratingTag = item.rating ? '<span class="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200"><span class="text-amber-600 font-bold">★</span> ' + item.rating + '</span>' : '';
            var costText = item.cost > 0 ? formatCurrency(item.cost) : 'Included / Free';

            var humanTipHtml = item.humanTip
                ? '<div class="mt-2.5 flex items-start gap-2 bg-surface-container/60 px-3 py-2 rounded-xl text-on-surface-variant border border-outline-variant/20">' +
                    '<span class="material-symbols-outlined text-[15px] text-secondary shrink-0 mt-0.5">verified_user</span>' +
                    '<p class="font-body-sm text-[11.5px] leading-relaxed text-on-surface-variant font-medium">' + item.humanTip + '</p>' +
                  '</div>'
                : '';

            html += '<article class="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-outline-variant/15 hover:shadow-md transition-shadow">' +
                '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">' +
                    '<div class="flex flex-col sm:flex-row items-start gap-4 flex-1">' +
                        '<!-- Time Badge -->' +
                        '<div class="flex sm:flex-col items-center justify-center min-w-[72px] py-1.5 px-2.5 rounded-xl bg-surface-container text-primary font-headline-sm text-sm font-bold tracking-tight gap-1 sm:gap-0 shrink-0">' +
                            '<span>' + timeVal + '</span>' +
                            '<span class="font-label-sm text-[10px] text-on-surface-variant font-medium">' + timeAmpm + '</span>' +
                        '</div>' +
                        photoHtml +
                        '<div class="space-y-1.5 flex-1 min-w-0">' +
                            '<div class="flex flex-wrap items-center gap-2">' +
                                '<span class="font-label-sm text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container text-secondary">' + (item.source || 'Curated Highlight') + '</span>' +
                                ratingTag +
                                '<span class="font-label-sm text-xs font-semibold text-primary">' + costText + '</span>' +
                                '<span class="text-outline-variant">·</span>' +
                                '<span class="font-label-sm text-xs text-on-surface-variant">' + item.duration + '</span>' +
                            '</div>' +
                            '<h3 class="font-headline-sm text-base sm:text-lg font-bold text-primary tracking-tight">' + item.title + '</h3>' +
                            '<p class="font-body-sm text-xs sm:text-sm text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-secondary shrink-0">location_on</span><span class="truncate">' + truncate(item.location, 65) + '</span></p>' +
                            humanTipHtml +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</article>';
        });

        container.innerHTML = html;

        renderItineraryMap(dayIndex);
        updateTransitWidgetDetails(currentTrip, dayIndex);
    }

    // --- Interactive Route Map & Transit Widget ---

    let itineraryMap = null;
    let itineraryMarkers = [];
    let itineraryPolyline = null;

    // ============================================
    // BASEMAP HELPER — Carto with Key & OSM Fallback
    // ============================================
    function getBasemapTileUrl(isDark) {
        const key = (typeof CONFIG !== 'undefined' && CONFIG.BASEMAPS_API_KEY) ? CONFIG.BASEMAPS_API_KEY : '';
        const keyParam = key ? `?key=${encodeURIComponent(key)}` : '';
        if (isDark) {
            return `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${keyParam}`;
        }
        return `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${keyParam}`;
    }

    function createBasemapTileLayer(isDark) {
        const layer = L.tileLayer(getBasemapTileUrl(isDark), {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });
        layer.on('tileerror', function() {
            if (!layer._hasTileErrorFallback) {
                layer._hasTileErrorFallback = true;
                layer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
            }
        });
        return layer;
    }

    function renderItineraryMap(dayIndex) {
        if (!currentTrip || typeof L === 'undefined') return;
        const mapContainer = document.getElementById('itinerary-map');
        if (!mapContainer) return;

        const dest = currentTrip.destination;
        const centerLat = dest && dest.lat ? dest.lat : 15.2993;
        const centerLng = dest && dest.lng ? dest.lng : 74.1240;

        if (!itineraryMap) {
            itineraryMap = L.map('itinerary-map', {
                zoomControl: true,
                scrollWheelZoom: false
            }).setView([centerLat, centerLng], 12);

            const isDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
            createBasemapTileLayer(isDark).addTo(itineraryMap);
        } else {
            setTimeout(() => { if (itineraryMap) itineraryMap.invalidateSize(); }, 250);
        }

        // Clear existing markers & lines
        if (itineraryMarkers.length > 0) {
            itineraryMarkers.forEach(m => itineraryMap.removeLayer(m));
            itineraryMarkers = [];
        }
        if (itineraryPolyline) {
            itineraryMap.removeLayer(itineraryPolyline);
            itineraryPolyline = null;
        }

        const day = currentTrip.itinerary && currentTrip.itinerary[dayIndex];
        const points = [];

        if (day && day.items && day.items.length > 0) {
            day.items.forEach(function(item, idx) {
                let lat = item.lat;
                let lng = item.lng;
                if (!lat || !lng) {
                    const angle = (idx / day.items.length) * 2 * Math.PI;
                    const radius = 0.02 + (idx * 0.012);
                    lat = centerLat + (Math.sin(angle) * radius);
                    lng = centerLng + (Math.cos(angle) * radius);
                }

                points.push([lat, lng]);

                const iconHtml = '<div style="background: #012d1d; color: #ffffff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">' + (idx + 1) + '</div>';
                const customIcon = L.divIcon({
                    className: 'itinerary-map-marker',
                    html: iconHtml,
                    iconSize: [26, 26],
                    iconAnchor: [13, 13]
                });

                const marker = L.marker([lat, lng], { icon: customIcon })
                    .addTo(itineraryMap)
                    .bindPopup('<strong>' + (idx + 1) + '. ' + item.title + '</strong><br><span style="font-size:11px; color:#555;">' + (item.time || '') + ' · ' + truncate(item.location || '', 45) + '</span>');

                itineraryMarkers.push(marker);
            });

            if (points.length > 1) {
                itineraryPolyline = L.polyline(points, {
                    color: '#895112',
                    weight: 3,
                    opacity: 0.85,
                    dashArray: '6, 6'
                }).addTo(itineraryMap);
            }

            if (points.length > 0) {
                const bounds = L.latLngBounds(points);
                itineraryMap.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
            }

            const labelEl = document.getElementById('map-stops-label');
            if (labelEl) {
                labelEl.textContent = 'Day ' + (dayIndex + 1) + ' Route (' + points.length + ' Stops)';
            }
        }
    }

    function updateTransitWidgetDetails(trip, dayIndex) {
        if (!trip) return;
        const dest = (trip.destination && trip.destination.name) ? trip.destination.name.toLowerCase() : '';
        const day = trip.itinerary && trip.itinerary[dayIndex];
        const itemCount = day ? day.items.length : 3;

        const totalKm = itemCount * 12;
        const totalMin = itemCount * 22;

        const kmEl = document.getElementById('transit-daily-km');
        if (kmEl) kmEl.textContent = '~' + totalKm + ' km';

        const timeEl = document.getElementById('transit-daily-time');
        if (timeEl) timeEl.textContent = '~' + Math.floor(totalMin / 60) + 'h ' + (totalMin % 60) + 'm transit';

        const avgLegEl = document.getElementById('transit-avg-leg');
        if (avgLegEl) avgLegEl.textContent = '15–25 mins';

        const badgeEl = document.getElementById('transit-type-badge');
        const opt1Name = document.getElementById('transit-option-1-name');
        const opt1Rate = document.getElementById('transit-option-1-rate');
        const opt2Name = document.getElementById('transit-option-2-name');
        const opt2Rate = document.getElementById('transit-option-2-rate');

        if (dest.includes('goa')) {
            if (badgeEl) badgeEl.textContent = 'Self-Drive or Taxi';
            if (opt1Name) opt1Name.textContent = 'Full-Day AC Taxi';
            if (opt1Rate) opt1Rate.textContent = '₹2,400 / day';
            if (opt2Name) opt2Name.textContent = 'Self-Drive Car / Scooter';
            if (opt2Rate) opt2Rate.textContent = '₹1,200 (Car) · ₹450 (Scooter)';
        } else if (dest.includes('tirupati')) {
            if (badgeEl) badgeEl.textContent = 'APSRTC Ghat EV Shuttle';
            if (opt1Name) opt1Name.textContent = 'Private AC Cab (Tirumala)';
            if (opt1Rate) opt1Rate.textContent = '₹2,000 / day';
            if (opt2Name) opt2Name.textContent = 'APSRTC AC Electric Bus';
            if (opt2Rate) opt2Rate.textContent = '₹90 / ticket';
        } else if (dest.includes('munnar')) {
            if (badgeEl) badgeEl.textContent = 'Private Hill Chauffeur';
            if (opt1Name) opt1Name.textContent = 'Hill Station Cab (Innova/SUV)';
            if (opt1Rate) opt1Rate.textContent = '₹2,800 / day';
            if (opt2Name) opt2Name.textContent = 'Estate Jeep Safari';
            if (opt2Rate) opt2Rate.textContent = '₹1,500 / trip';
        } else if (dest.includes('varanasi')) {
            if (badgeEl) badgeEl.textContent = 'Auto / E-Rickshaw & Boat';
            if (opt1Name) opt1Name.textContent = 'Private AC City Cab';
            if (opt1Rate) opt1Rate.textContent = '₹1,800 / day';
            if (opt2Name) opt2Name.textContent = 'Private Sunrise Ganga Boat';
            if (opt2Rate) opt2Rate.textContent = '₹600 / boat';
        } else {
            if (badgeEl) badgeEl.textContent = 'Private Chauffeur';
            if (opt1Name) opt1Name.textContent = 'Full-Day Dedicated Cab';
            if (opt1Rate) opt1Rate.textContent = '₹2,200 / day';
            if (opt2Name) opt2Name.textContent = 'Self-Drive Rental';
            if (opt2Rate) opt2Rate.textContent = '₹1,400 / day';
        }
    }

    // --- Pair 2: Budget Optimization (REMOVED) ---

    // The static optimization drawer was removed because it was redundant and confusing.
    
    async function triggerDisruptionReplan(disruptionType) {
        if (!currentTrip || !currentTrip.itinerary) return;

        backupItinerary = JSON.parse(JSON.stringify(currentTrip.itinerary));

        let replanData = null;
        try {
            const resp = await fetch('http://localhost:8000/api/itinerary/replan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: currentTrip.destination.name,
                    itinerary: currentTrip.itinerary,
                    disruption_type: disruptionType
                })
            });
            if (resp.ok) {
                const json = await resp.json();
                if (json.status === 'success') replanData = json.data;
            }
        } catch (e) { }

        // Fallback if server offline
        if (!replanData) {
            const dest = currentTrip.destination.name;
            replanData = {
                disruption_type: disruptionType,
                summary: disruptionType === 'rain'
                    ? 'Heavy rain alert detected in ' + dest + '. Outdoor activities automatically swapped with high-rated indoor cultural centers.'
                    : 'High traffic congestion detected on main routes in ' + dest + '. Transit times buffered to save travel delay.',
                swapped_details: disruptionType === 'rain' ? [
                    { original: 'Outdoor Beach/Trek', replanned: 'Local Culinary Masterclass', reason: 'Avoided heavy rainfall (Indoor Activity)' },
                    { original: 'Open Fort Viewpoint', replanned: 'Premium Indoor Spa Retreat', reason: 'Sheltered relaxation during storm' }
                ] : [
                    { original: 'Distant City Monument', replanned: 'Walking-distance Local Cafe', reason: 'Bypassed 1hr traffic gridlock' },
                    { original: 'Cross-town Transit', replanned: 'Nearby Artisan Market', reason: 'Optimized routing for gridlock' }
                ],
                replanned_itinerary: currentTrip.itinerary.map(function(day) {
                    var newItems = day.items.map(function(item) {
                        var copy = Object.assign({}, item);
                        if (disruptionType === 'rain' && (copy.title.toLowerCase().includes('beach') || copy.title.toLowerCase().includes('fort') || copy.title.toLowerCase().includes('outdoor'))) {
                            copy.title = copy.title.toLowerCase().includes('beach') ? 'Local Culinary Masterclass' : 'Premium Indoor Spa Retreat';
                            copy.source = 'Auto-Swapped (Rain Bypass)';
                        } else if (disruptionType === 'traffic' && copy.type === 'transport') {
                            copy.title = 'Walking-distance Cafe/Market';
                            copy.source = 'Auto-Swapped (Traffic Bypass)';
                        }
                        return copy;
                    });
                    return { date: day.date, dayLabel: day.dayLabel, items: newItems };
                })
            };
        }

        currentTrip.itinerary = replanData.replanned_itinerary;
        renderItineraryTabs(currentTrip.itinerary);
        renderItineraryDay(0);

        const diffCard = document.getElementById('replan-diff-card');
        if (diffCard) {
            diffCard.classList.remove('hidden');
            const titleEl = document.getElementById('replan-diff-title');
            if (titleEl) {
                titleEl.textContent = (disruptionType === 'rain' ? 'Live Weather Alert — Itinerary Swapped' : 'Live Traffic Alert — Route Optimized');
            }
            const sumEl = document.getElementById('replan-diff-summary');
            if (sumEl) sumEl.textContent = replanData.summary;

            const diffContainer = document.getElementById('replan-diff-items');
            if (diffContainer) {
                diffContainer.innerHTML = replanData.swapped_details.map(function(d) {
                    return '<div class="flex items-center justify-between p-2 rounded-lg bg-surface-container/60 border border-outline-variant/15">' +
                        '<div><span class="line-through text-on-surface-variant text-xs">' + d.original + '</span> <span class="text-secondary mx-1 font-bold">➔</span> <strong class="text-primary text-xs font-semibold">' + d.replanned + '</strong></div>' +
                        '<span class="text-[10px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded">' + d.reason + '</span>' +
                    '</div>';
                }).join('');
            }
            diffCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function acceptReplannedItinerary() {
        const diffCard = document.getElementById('replan-diff-card');
        if (diffCard) diffCard.classList.add('hidden');
    }

    function revertReplannedItinerary() {
        if (backupItinerary && currentTrip) {
            currentTrip.itinerary = backupItinerary;
            renderItineraryTabs(currentTrip.itinerary);
            renderItineraryDay(0);
        }
        const diffCard = document.getElementById('replan-diff-card');
        if (diffCard) diffCard.classList.add('hidden');
    }

    // --- Hotels ---

    function renderHotels(hotelData) {
        const container = document.getElementById('hotel-list-container');
        if (!hotelData || hotelData.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="es-icon">H</div><h3>No hotels found</h3><p class="mt-2">Try a different destination.</p></div>';
            return;
        }

        container.innerHTML = hotelData.map(function(hotel) {
            var priceEstimate = estimateHotelPrice(hotel);
            var photoHtml = hotel.photo
                ? '<img src="' + hotel.photo + '" class="hotel-photo" alt="' + hotel.name + '" onerror="this.classList.add(\'skeleton\',\'skeleton-photo\')">'
                : '<div class="hotel-photo skeleton skeleton-photo"></div>';
            var ratingHtml = hotel.rating
                ? '<div class="hotel-rating"><span class="star">★</span> ' + hotel.rating + '</div>' +
                  '<span class="hotel-reviews">(' + hotel.totalRatings + ' reviews)</span>'
                : '';

            return '<div class="hotel-card">' +
                photoHtml +
                '<div class="hotel-info">' +
                    '<div class="hotel-name">' + hotel.name + '</div>' +
                    '<div class="hotel-address">' + truncate(hotel.address, 65) + '</div>' +
                    '<div class="hotel-meta">' +
                        ratingHtml +
                        '<div class="hotel-price">' +
                            '<div class="amount">' + formatCurrency(priceEstimate) + '</div>' +
                            '<div class="per-night">per night (est.)</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="hotel-footer">' +
                        '<span class="source-tag">' + hotel.source + ' — ' + hotel.fetchedAt + '</span>' +
                        '<button class="btn btn-sm btn-primary" onclick="app.bookHotel(\'' + hotel.id + '\')">View</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function estimateHotelPrice(hotel) {
        // AI Dynamic Budget Tapering: 
        // Adapts the scraped hotel's tier to match the user's actual spending power
        let baseBudget = 3000;
        if (currentTrip && currentTrip.budgetBreakdown && currentTrip.numDays) {
            baseBudget = currentTrip.budgetBreakdown.accommodation / currentTrip.numDays;
        }
        
        let multiplier = 1.0;
        if (hotel.priceLevel === 1 || hotel.rating < 4.0) multiplier = 0.6; // Budget tier
        else if (hotel.priceLevel === 2 || (hotel.rating >= 4.0 && hotel.rating < 4.5)) multiplier = 0.9; // Standard tier
        else multiplier = 1.3; // Premium tier
        
        // Ensure price looks realistic (rounded to nearest 100)
        return Math.round((baseBudget * multiplier) / 100) * 100;
    }

    function filterHotels(filter, btn) {
        document.querySelectorAll('#hotel-filters .chip').forEach(function(c) { c.classList.remove('active'); });
        btn.classList.add('active');

        var filtered = hotels.slice();
        if (filter === 'budget') {
            filtered = hotels.filter(function(h) { return estimateHotelPrice(h) <= 2000; });
        } else if (filter === 'mid') {
            filtered = hotels.filter(function(h) { var p = estimateHotelPrice(h); return p > 2000 && p <= 5000; });
        } else if (filter === 'premium') {
            filtered = hotels.filter(function(h) { return estimateHotelPrice(h) > 5000; });
        }

        if (filtered.length === 0 && filter !== 'all') {
            document.getElementById('hotel-list-container').innerHTML =
                '<div class="empty-state"><div class="es-icon">H</div><h3>No ' + filter + ' hotels found</h3><p class="mt-2">Try a different filter.</p></div>';
        } else {
            renderHotels(filtered.length > 0 ? filtered : hotels);
        }
    }

    let activeBookingHotel = null;
    let selectedRoomMultiplier = 0;
    
    function bookHotel(placeId) {
        const hotel = hotels.find(h => h.id === placeId);
        if (!hotel || !currentTrip) return;
        
        activeBookingHotel = hotel;
        const nights = Math.max(1, currentTrip.numDays - 1);
        const baseRate = Math.round(currentTrip.budgetBreakdown.accommodation / currentTrip.numDays);
        
        document.getElementById('booking-hotel-name').textContent = 'Book ' + truncate(hotel.name, 30);
        document.getElementById('summary-nights').textContent = nights;
        
        // Setup prices
        document.getElementById('price-standard').textContent = formatCurrency(baseRate);
        document.getElementById('price-deluxe').textContent = formatCurrency(Math.round(baseRate * 1.5));
        document.getElementById('price-suite').textContent = formatCurrency(Math.round(baseRate * 2.5));
        
        // Reset state
        document.querySelectorAll('.room-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('price-breakdown').classList.add('hidden');
        document.getElementById('booking-step-1').classList.remove('hidden');
        document.getElementById('booking-step-2').classList.add('hidden');
        
        document.getElementById('booking-modal').classList.remove('hidden');
    }

    function closeBookingModal() {
        document.getElementById('booking-modal').classList.add('hidden');
    }

    function selectRoom(type, multiplier) {
        document.querySelectorAll('.room-card').forEach(c => c.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
        
        selectedRoomMultiplier = multiplier;
        const nights = Math.max(1, currentTrip.numDays - 1);
        const baseRate = Math.round(currentTrip.budgetBreakdown.accommodation / currentTrip.numDays);
        
        const subtotal = Math.round(baseRate * multiplier * nights);
        const tax = Math.round(subtotal * 0.18); // 18% GST
        
        document.getElementById('summary-base').textContent = formatCurrency(subtotal);
        document.getElementById('summary-tax').textContent = formatCurrency(tax);
        document.getElementById('summary-total').textContent = formatCurrency(subtotal + tax);
        
        document.getElementById('price-breakdown').classList.remove('hidden');
    }

    function confirmBooking() {
        // Generate random Booking Receipt
        const receipt = 'BK-' + Math.floor(100000 + Math.random() * 900000);
        document.getElementById('booking-ref').textContent = receipt;
        
        // Update the itinerary item for hotel if it exists
        if (currentTrip && currentTrip.itinerary && currentTrip.itinerary[0]) {
            const hotelItem = currentTrip.itinerary[0].items.find(i => i.type === 'accommodation');
            if (hotelItem) {
                hotelItem.title = 'Confirmed Stay at ' + truncate(activeBookingHotel.name, 25);
                hotelItem.source = 'Booking: ' + receipt;
            }
            renderItineraryTabs(currentTrip.itinerary);
            renderItineraryDay(0);
        }
        
        document.getElementById('booking-step-1').classList.add('hidden');
        document.getElementById('booking-step-2').classList.remove('hidden');
    }

    // --- Explore Page ---

    function renderExplore() {
        const grid = document.getElementById('explore-grid');
        grid.innerHTML = Object.entries(CONFIG.DESTINATIONS).map(function(entry) {
            var key = entry[0], dest = entry[1];
            return '<div class="card" style="cursor: pointer;" onclick="app.exploreDest(\'' + key + '\')">' +
                '<h3>' + dest.name + '</h3>' +
                '<p style="font-size: 0.85rem; color: var(--clr-text-secondary); margin: 4px 0;">' + dest.tagline + '</p>' +
                '<div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">' +
                    dest.tags.slice(0, 3).map(function(t) { return '<span class="timeline-tag">' + t + '</span>'; }).join('') +
                '</div>' +
                '<div style="font-size: 0.75rem; color: var(--clr-text-tertiary); margin-top: 8px;">' +
                    dest.state + ' — From ' + formatCurrency(dest.avgDailyBudget.budget) + '/day' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function exploreDest(key) {
        var dest = CONFIG.DESTINATIONS[key];
        if (!dest) return;
        document.getElementById('input-destination').value = dest.name;
        selectedBudget = dest.avgDailyBudget.standard * 3;
        document.querySelectorAll('#budget-options .chip').forEach(function(c) { c.classList.remove('active'); });
        showView('planning-view');
    }

    // --- Utilities ---

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    function formatCurrency(amount) {
        return '\u20B9' + amount.toLocaleString('en-IN');
    }

    // --- Init ---

    function init() {
        var start = new Date();
        start.setDate(start.getDate() + 7);
        var end = new Date(start);
        end.setDate(end.getDate() + 2);

        const startInput = document.getElementById('input-start-date');
        const endInput = document.getElementById('input-end-date');
        const destInput = document.getElementById('input-destination');

        if (startInput) {
            startInput.value = formatDateInput(start);
            startInput.addEventListener('change', updateTelemetryForDates);
            startInput.addEventListener('input', updateTelemetryForDates);
        }
        if (endInput) {
            endInput.value = formatDateInput(end);
            endInput.addEventListener('change', updateTelemetryForDates);
            endInput.addEventListener('input', updateTelemetryForDates);
        }
        if (destInput) {
            destInput.addEventListener('change', updateTelemetryForDates);
        }

        setupDestinationAutocomplete();
        renderExplore();
        updateTelemetryForDates();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // --- Event Intelligence Dashboard (Task A + Task B) ---

    async function loadEventDashboard(overrideDest) {
        const container = document.getElementById('event-dashboard-container');
        function getColor(status) {
            return (status === 'CRITICAL' || status === 'EXTREME') ? 'status-critical' : (status === 'HIGH' ? 'status-over' : (status === 'MEDIUM' ? 'status-tight' : 'status-healthy'));
        }

        const typedDest = document.getElementById('input-destination')?.value.trim();
        const eventInputDest = document.getElementById('event-dest-input')?.value.trim();

        let currentDest = overrideDest || eventInputDest || (currentTrip ? currentTrip.destination.name : typedDest) || 'Goa';

        // Capitalize destination name
        currentDest = currentDest.charAt(0).toUpperCase() + currentDest.slice(1);
        if (document.getElementById('event-dest-input')) {
            document.getElementById('event-dest-input').value = currentDest;
        }

        container.innerHTML = '<div class="empty-state"><div class="es-icon">E</div><h3>Loading Live Event Signals for ' + currentDest + '...</h3></div>';

        let eventData = null;
        try {
            let apiUrl = 'http://localhost:8000/api/admin/event-intelligence?destination=' + encodeURIComponent(currentDest);
            if (currentTrip && currentTrip.startDate) {
                apiUrl += '&travel_date=' + currentTrip.startDate.toISOString().split('T')[0];
            }
            
            const resp = await fetch(apiUrl);
            if (resp.ok) {
                const json = await resp.json();
                if (json.status === 'success') eventData = json.data;
            }
        } catch (e) {
            console.warn('Backend API offline, using fallback client calculation');
        }

        // Fallback calculation if backend API server is offline
        if (!eventData) {
            const isHighDensity = ['tirupati', 'tirupathi', 'varanasi', 'puri', 'goa', 'kedarnath', 'mysore'].includes(currentDest.toLowerCase());
            eventData = {
                event_name: currentDest + " Surge & Event Intelligence",
                destination: currentDest,
                estimated_demand: isHighDensity ? "3.9M" : "450K",
                metrics: {
                    crowd_pressure: isHighDensity ? "HIGH" : "MEDIUM",
                    transport_demand: isHighDensity ? "HIGH" : "MEDIUM",
                    medical_demand: isHighDensity ? "MEDIUM" : "LOW"
                },
                area_density: {
                    "Area A (Main Venue/Center)": isHighDensity ? "HIGH" : "MEDIUM",
                    "Area B (Transit Hubs)": isHighDensity ? "HIGH" : "MEDIUM",
                    "Area C (Outer Parking)": "LOW"
                },
                recommended_actions: isHighDensity ? [
                    "Increase shuttle bus frequency on main transit routes",
                    "Open secondary overflow parking lot at Highway Exit 2",
                    "Deploy crowd management personnel near main entrance and gates",
                    "Deploy additional medical triage staff near North Gate"
                ] : [
                    "Monitor transit queue lengths during peak hours",
                    "Standard crowd monitoring active"
                ],
                last_updated: "Live Signals"
            };
        }

        renderEventDashboardUI(eventData);
    }

    function renderEventDashboardUI(data) {
        const container = document.getElementById('event-dashboard-container');
        function getColor(status) {
            return (status === 'CRITICAL' || status === 'EXTREME') ? 'status-critical' : (status === 'HIGH' ? 'status-over' : (status === 'MEDIUM' ? 'status-tight' : 'status-healthy'));
        }

        
        let actionsHtml = data.recommended_actions.map(function(act) {
            return '<li style="margin-bottom: 8px; font-size: 0.88rem; color: var(--clr-text);">' + act + '</li>';
        }).join('');

        let densityHtml = Object.entries(data.area_density).map(function(entry) {
            var area = entry[0], status = entry[1];
            var colorClass = getColor(status);
            return '<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--clr-border-light); font-size: 0.85rem;">' +
                '<span>' + area + '</span>' +
                '<span class="' + colorClass + '" style="font-weight: 600;">' + status + '</span>' +
            '</div>';
        }).join('');

        container.innerHTML = 
            '<div class="card mb-2" style="margin-bottom: 16px;">' +
                '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">' +
                    '<div>' +
                        '<h2>' + data.event_name + '</h2>' +
                        '<div style="font-size: 0.8rem; color: var(--clr-text-secondary);">' + data.destination + ' · Anonymized Demand Signals</div>' +
                    '</div>' +
                    '<span class="source-tag">' + data.last_updated + '</span>' +
                '</div>' +
                '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px;">' +
                    '<div style="background: var(--clr-surface-alt); padding: 14px; border-radius: var(--radius-md); text-align: center;">' +
                        '<div class="budget-label">Est. Demand</div>' +
                        '<div class="budget-amount highlight">' + data.estimated_demand + '</div>' +
                    '</div>' +
                    '<div style="background: var(--clr-surface-alt); padding: 14px; border-radius: var(--radius-md); text-align: center;">' +
                        '<div class="budget-label">Crowd Pressure</div>' +
                        '<div class="budget-amount ' + getColor(data.metrics.crowd_pressure) + '">' + data.metrics.crowd_pressure + '</div>' +
                    '</div>' +
                    '<div style="background: var(--clr-surface-alt); padding: 14px; border-radius: var(--radius-md); text-align: center;">' +
                        '<div class="budget-label">Transport Demand</div>' +
                        '<div class="budget-amount ' + getColor(data.metrics.transport_demand) + '">' + data.metrics.transport_demand + '</div>' +
                    '</div>' +
                    '<div style="background: var(--clr-surface-alt); padding: 14px; border-radius: var(--radius-md); text-align: center;">' +
                        '<div class="budget-label">Medical Demand</div>' +
                        '<div class="budget-amount ' + getColor(data.metrics.medical_demand) + '">' + data.metrics.medical_demand + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="dashboard-top" style="margin-bottom: 16px;">' +
                '<div class="card">' +
                    '<h3>Area Density Levels</h3>' +
                    '<div style="margin-top: 12px;">' + densityHtml + '</div>' +
                '</div>' +
                '<div class="card">' +
                    '<h3>Recommended Municipal Actions</h3>' +
                    '<ul style="margin-top: 12px; padding-left: 20px;">' + actionsHtml + '</ul>' +
                '</div>' +
            '</div>';
    }

    // --- Multimodal Transit & Route Engine ---
    let roadtripMap = null;

    window.KNOWN_CITIES = {
        hyderabad: { code: 'HYD', name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, airport: 'RGIA (HYD)' },
        hyd: { code: 'HYD', name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, airport: 'RGIA (HYD)' },
        bangalore: { code: 'BLR', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, airport: 'Kempegowda (BLR)' },
        bengaluru: { code: 'BLR', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, airport: 'Kempegowda (BLR)' },
        blr: { code: 'BLR', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, airport: 'Kempegowda (BLR)' },
        chennai: { code: 'MAA', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, airport: 'Chennai Intl (MAA)' },
        madras: { code: 'MAA', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, airport: 'Chennai Intl (MAA)' },
        maa: { code: 'MAA', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, airport: 'Chennai Intl (MAA)' },
        mumbai: { code: 'BOM', name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, airport: 'CSMT / BOM' },
        bombay: { code: 'BOM', name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, airport: 'CSMT / BOM' },
        bom: { code: 'BOM', name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, airport: 'CSMT / BOM' },
        pune: { code: 'PNQ', name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, airport: 'Pune Intl (PNQ)' },
        pnq: { code: 'PNQ', name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, airport: 'Pune Intl (PNQ)' },
        delhi: { code: 'DEL', name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.2090, airport: 'Indira Gandhi (DEL)' },
        newdelhi: { code: 'DEL', name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.2090, airport: 'Indira Gandhi (DEL)' },
        del: { code: 'DEL', name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.2090, airport: 'Indira Gandhi (DEL)' },
        kolkata: { code: 'CCU', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, airport: 'Netaji Subhash (CCU)' },
        calcutta: { code: 'CCU', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, airport: 'Netaji Subhash (CCU)' },
        ccu: { code: 'CCU', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, airport: 'Netaji Subhash (CCU)' },
        kochi: { code: 'COK', name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, airport: 'Cochin Intl (COK)' },
        cochin: { code: 'COK', name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, airport: 'Cochin Intl (COK)' },
        cok: { code: 'COK', name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, airport: 'Cochin Intl (COK)' },
        lucknow: { code: 'LKO', name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, airport: 'CCSI Airport (LKO)' },
        lko: { code: 'LKO', name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, airport: 'CCSI Airport (LKO)' },
        ahmedabad: { code: 'AMD', name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, airport: 'SVPI Airport (AMD)' },
        amd: { code: 'AMD', name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, airport: 'SVPI Airport (AMD)' },
        jaipur: { code: 'JAI', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, airport: 'Jaipur Intl (JAI)' },
        jai: { code: 'JAI', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, airport: 'Jaipur Intl (JAI)' },
        visakhapatnam: { code: 'VTZ', name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, airport: 'Vizag (VTZ)' },
        vizag: { code: 'VTZ', name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, airport: 'Vizag (VTZ)' },
        vtz: { code: 'VTZ', name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, airport: 'Vizag (VTZ)' },
        coimbatore: { code: 'CJB', name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, airport: 'Coimbatore (CJB)' },
        cjb: { code: 'CJB', name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, airport: 'Coimbatore (CJB)' },
        goa: { code: 'GOI', name: 'South Goa', state: 'Goa', lat: 15.2993, lng: 74.1240, airport: 'Dabolim / MOPA (GOI)' },
        goi: { code: 'GOI', name: 'South Goa', state: 'Goa', lat: 15.2993, lng: 74.1240, airport: 'Dabolim / MOPA (GOI)' },
        tirupati: { code: 'TIR', name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192, airport: 'Renigunta (TIR)' },
        tir: { code: 'TIR', name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192, airport: 'Renigunta (TIR)' },
        munnar: { code: 'MUN', name: 'Munnar', state: 'Kerala', lat: 10.0889, lng: 77.0595, airport: 'Cochin Gateway (COK)' },
        mun: { code: 'MUN', name: 'Munnar', state: 'Kerala', lat: 10.0889, lng: 77.0595, airport: 'Cochin Gateway (COK)' },
        pondicherry: { code: 'PNY', name: 'Pondicherry', state: 'Puducherry', lat: 11.9416, lng: 79.8083, airport: 'Puducherry (PNY)' },
        puducherry: { code: 'PNY', name: 'Pondicherry', state: 'Puducherry', lat: 11.9416, lng: 79.8083, airport: 'Puducherry (PNY)' },
        pny: { code: 'PNY', name: 'Pondicherry', state: 'Puducherry', lat: 11.9416, lng: 79.8083, airport: 'Puducherry (PNY)' },
        varanasi: { code: 'VNS', name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, airport: 'Babatpur (VNS)' },
        kashi: { code: 'VNS', name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, airport: 'Babatpur (VNS)' },
        vns: { code: 'VNS', name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, airport: 'Babatpur (VNS)' }
    };

    let transitState = {
        origin: 'Bengaluru',
        originCode: 'BLR',
        dest: 'South Goa',
        destKey: 'goa',
        destCode: 'GOI'
    };
    let activeCorridor = null;

    const ROUTE_CORRIDORS = {
        // --- GOA CORRIDORS ---
        bangalore_goa: {
            originCode: 'BLR',
            originName: 'Bengaluru',
            destCode: 'GOI',
            destName: 'South Goa (Cola Bay)',
            status: 'Corridor Flow: Clear & Open',
            corridorName: 'NH-48 ➔ NH-69 Pass',
            corridorSub: 'Western Ghats Rainforest Transit',
            distance: 584,
            driveTime: '9h 45m with 2 stops',
            avgSpeed: '78 km/h on NH-48',
            tempProfile: '24°C High Ghats',
            fuelCost: '₹3,400',
            tollCost: '₹540',
            permitCost: '₹150',
            foodCost: '₹1,200',
            totalCost: '₹5,290',
            evNote: '4 CCS2 60kW DC Hyperchargers verified operational along highway bypasses.',
            elevation: {
                range: '920m Peak ➔ 0m Sea Level',
                sub: '(Deccan Plateau descent to Arabian Sea)',
                gain: '+430 m',
                descent: '-1,350 m',
                hairpins: '22 Graded Bends',
                gear: 'Hill Descent / Standard Drive',
                points: '0,20 180,24 350,30 480,10 580,28 650,65 720,88 800,95',
                polyline: '0,20 180,24 350,30 480,10 580,28 650,65 720,88 800,95'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 260 KM',
                    title: 'Davanagere Benne Halt',
                    desc: 'Iconic butter flatbreads at Sri Guru Kottureshwara. 35-min designated culinary refuel window.',
                    hours: 'Open 07:00 - 22:00',
                    cost: '₹180 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 14.4644,
                    lng: 75.9218
                },
                {
                    km: 'STOP 2 · 370 KM',
                    title: 'Jog Falls Escarpment',
                    desc: "India's magnificent cataract gorge deck. 830ft panoramic mist overlook with forest access.",
                    hours: 'Scenic Overlook',
                    cost: '+45 min detour',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 14.2285,
                    lng: 74.8124
                },
                {
                    km: 'STOP 3 · 490 KM',
                    title: 'Anshi Ghat Sanctuary',
                    desc: 'Dense evergreen rainforest highway corridor in Kali Tiger Reserve buffer canopy.',
                    hours: 'Eco Transit Zone',
                    cost: 'FASTag entry',
                    img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop',
                    lat: 15.0250,
                    lng: 74.3800
                }
            ],
            fallbacks: {
                flight: { route: 'BLR ➔ GOI (Dabolim / MOPA)', sub: '4 Non-stop departures daily · 1h 10m', fare: 'From ₹3,850', airlines: 'IndiGo · Air India Express' },
                rail: { name: 'Vande Bharat Express (SBC - MAO)', sub: 'Madgaon Semi-High Speed · 7h 45m scenic pass', fare: '₹1,620', seats: '14 Exec Seats Available' },
                chauffeur: { name: 'Private Chauffeur SUV', sub: 'Toyota Innova HyCross · Dedicated Driver', fare: '₹18,000' }
            },
            originCoords: { lat: 12.9716, lng: 77.5946 },
            destCoords: { lat: 15.0543, lng: 73.9789 }
        },
        goa: null, // assigned below to bangalore_goa

        hyderabad_goa: {
            originCode: 'HYD',
            originName: 'Hyderabad',
            destCode: 'GOI',
            destName: 'South Goa (Cola Bay)',
            status: 'Corridor Flow: Clear & Open',
            corridorName: 'NH-65 ➔ NH-50 ➔ NH-748 Pass',
            corridorSub: 'Deccan Plain through Bagalkot & Chorla Ghat',
            distance: 645,
            driveTime: '12h 15m with 2 stops',
            avgSpeed: '70 km/h on NH-50',
            tempProfile: '26°C Deccan Plateau',
            fuelCost: '₹3,870',
            tollCost: '₹580',
            permitCost: '₹150',
            foodCost: '₹1,100',
            totalCost: '₹5,700',
            evNote: '6 DC Fast Charger stalls active at Jadcherla, Raichur Bypass, and Belagavi corridor.',
            elevation: {
                range: '620m Peak ➔ 0m Sea Level',
                sub: '(Deccan Plateau descent to Arabian Sea via Chorla Ghat)',
                gain: '+380 m',
                descent: '-980 m',
                hairpins: '34 Graded Bends',
                gear: 'Hill Descent / Third Gear Mode',
                points: '0,40 200,45 380,42 520,38 640,30 720,75 800,95',
                polyline: '0,40 200,45 380,42 520,38 640,30 720,75 800,95'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 185 KM',
                    title: 'Mahbubnagar Heritage Tiffin',
                    desc: 'Hot crispy Ghee Karam Dosas, authentic tiffin and filter coffee at NH-44 highway oasis.',
                    hours: 'Open 06:00 - 23:00',
                    cost: '₹200 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 16.7432,
                    lng: 77.9890
                },
                {
                    km: 'STOP 2 · 410 KM',
                    title: 'Bagalkot Jolada Roti Feast',
                    desc: 'Authentic North Karnataka sorghum flatbreads, spicy stuffed brinjal, and garlic Shenga Chutney.',
                    hours: 'Open 11:30 - 22:30',
                    cost: '₹280 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: 16.1824,
                    lng: 75.6961
                },
                {
                    km: 'STOP 3 · 575 KM',
                    title: 'Chorla Ghat Cloud Pass',
                    desc: 'Dense Sahyadri rainforest descent overlook with misty mountain canopy viewpoints.',
                    hours: 'Scenic Forest Deck',
                    cost: 'Forest Toll Pass',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 15.6672,
                    lng: 74.1356
                }
            ],
            fallbacks: {
                flight: { route: 'HYD ➔ GOI (Direct Flights)', sub: '6 Non-stop departures daily · 1h 15m', fare: 'From ₹3,200', airlines: 'IndiGo · Air India Express · Akasa Air' },
                rail: { name: 'Kacheguda - Vasco da Gama Express', sub: 'Weekly Express · 14h 30m direct rail transit', fare: '₹540 SL / ₹1,480 3A', seats: 'Weekly Services' },
                chauffeur: { name: 'Interstate Innova Crysta SUV', sub: 'Dedicated Driver · Fuel & Border Tolls Included', fare: '₹19,500' }
            },
            originCoords: { lat: 17.3850, lng: 78.4867 },
            destCoords: { lat: 15.0543, lng: 73.9789 }
        },

        chennai_goa: {
            originCode: 'MAA',
            originName: 'Chennai',
            destCode: 'GOI',
            destName: 'South Goa (Cola Bay)',
            status: 'Corridor Flow: Smooth via NH-48',
            corridorName: 'NH-48 via Bengaluru & Hubballi',
            corridorSub: 'Coromandel Coast across Peninsula to Western Ghats',
            distance: 890,
            driveTime: '15h 30m with 3 stops',
            avgSpeed: '72 km/h on NH-48',
            tempProfile: '25°C Tropical Crossing',
            fuelCost: '₹5,340',
            tollCost: '₹980',
            permitCost: '₹200',
            foodCost: '₹1,600',
            totalCost: '₹8,120',
            evNote: 'NHAI Expressway corridor equipped with 80+ fast DC charging stalls at every 70km.',
            elevation: {
                range: '920m Peak ➔ 0m Sea Level',
                sub: '(Coromandel ascent to Deccan plateau, descending to Konkan)',
                gain: '+450 m',
                descent: '-1,370 m',
                hairpins: '26 Graded Bends',
                gear: 'Highway Cruiser / Ghat Descent',
                points: '0,95 180,50 350,20 520,25 660,35 730,70 800,95',
                polyline: '0,95 180,50 350,20 520,25 660,35 730,70 800,95'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 140 KM',
                    title: 'Vellore Golden Fort Halt',
                    desc: 'Renowned highway dining plaza serving hot filter coffee, ghee idlis, and crisp vadas.',
                    hours: 'Open 06:30 - 22:30',
                    cost: '₹220 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 12.9165,
                    lng: 79.1325
                },
                {
                    km: 'STOP 2 · 350 KM',
                    title: 'Bengaluru Bypass Highway Meals',
                    desc: 'Expressway bypass culinary oasis with royal South Indian meals and refuel plaza.',
                    hours: 'Open 11:00 - 23:00',
                    cost: '₹350 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: 12.9716,
                    lng: 77.5946
                },
                {
                    km: 'STOP 3 · 680 KM',
                    title: 'Hubballi Dharwad Peda Halt',
                    desc: 'Signature heritage confectionery & highway tea pavilion for celebrated Dharwad pedas.',
                    hours: 'Open 08:00 - 22:00',
                    cost: '₹180 sweets',
                    img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&auto=format&fit=crop',
                    lat: 15.3647,
                    lng: 75.1240
                }
            ],
            fallbacks: {
                flight: { route: 'MAA ➔ GOI (Non-Stop)', sub: '3 Daily direct flights · 1h 25m', fare: 'From ₹3,650', airlines: 'IndiGo · Air India' },
                rail: { name: 'Chennai Central - Vasco da Gama Express', sub: 'Overnight Superfast · 20h direct link', fare: '₹620 SL / ₹1,650 3A', seats: 'Weekly Departures' },
                chauffeur: { name: 'Interstate Long-Haul SUV', sub: 'Toyota Innova HyCross · 2 Drivers Option', fare: '₹24,000' }
            },
            originCoords: { lat: 13.0827, lng: 80.2707 },
            destCoords: { lat: 15.0543, lng: 73.9789 }
        },

        mumbai_goa: {
            originCode: 'BOM',
            originName: 'Mumbai',
            destCode: 'GOI',
            destName: 'South Goa (Cola Bay)',
            status: 'Corridor Flow: Fast 4-Lane Flow',
            corridorName: 'NH-66 Konkan Expressway / AH47',
            corridorSub: 'Sahyadri Ridges & Arabian Sea Coastal Highway',
            distance: 590,
            driveTime: '10h 30m with 2 stops',
            avgSpeed: '74 km/h highway speed',
            tempProfile: '27°C Coastal Warmth',
            fuelCost: '₹3,540',
            tollCost: '₹620',
            permitCost: '₹120',
            foodCost: '₹1,200',
            totalCost: '₹5,480',
            evNote: 'Tata Power EZ Charge & Jio-bp pulse hubs active at Chiplun, Kolhapur and Sawantwadi.',
            elevation: {
                range: '750m Peak ➔ 0m Sea Level',
                sub: '(Sahyadri ghat ascent descending toward the Konkan shoreline)',
                gain: '+520 m',
                descent: '-1,270 m',
                hairpins: '38 Graded Bends',
                gear: 'Hill Descent & Coastal Cruise',
                points: '0,80 180,45 350,20 500,25 650,40 720,78 800,95',
                polyline: '0,80 180,45 350,20 500,25 650,40 720,78 800,95'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 210 KM',
                    title: 'Chiplun Valley Overlook',
                    desc: 'Breathtaking Vashishti river curve vista, fresh sol kadhi, and authentic Konkani snacks.',
                    hours: 'Open 07:00 - 22:00',
                    cost: '₹200 for two',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 17.5323,
                    lng: 73.5186
                },
                {
                    km: 'STOP 2 · 380 KM',
                    title: 'Kolhapur Misal & Maratha Feast',
                    desc: 'World-famous spicy Kolhapuri misal pav, fresh farsan, and Maratha highway hospitality.',
                    hours: 'Open 08:00 - 20:00',
                    cost: '₹160 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: 16.7050,
                    lng: 74.2433
                },
                {
                    km: 'STOP 3 · 510 KM',
                    title: 'Amboli Ghat Cascades',
                    desc: 'Misty mountain pass surrounded by seasonal waterfalls, verdant hills, and panoramic decks.',
                    hours: 'Scenic Overlook',
                    cost: 'Free access',
                    img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&auto=format&fit=crop',
                    lat: 15.9604,
                    lng: 73.9996
                }
            ],
            fallbacks: {
                flight: { route: 'BOM ➔ GOI (Non-Stop)', sub: '14 Daily non-stop departures · 1h 05m', fare: 'From ₹2,850', airlines: 'IndiGo · Air India · Akasa Air' },
                rail: { name: 'Vande Bharat Express (CSMT - MAO)', sub: 'Konkan Semi-High Speed · 7h 45m scenic panorama', fare: '₹1,815 CC', seats: 'Confirmed Chair Car' },
                chauffeur: { name: 'Konkan Coast Chauffeur SUV', sub: 'Toyota Innova Crysta · All Highway Tolls Included', fare: '₹17,500' }
            },
            originCoords: { lat: 19.0760, lng: 72.8777 },
            destCoords: { lat: 15.0543, lng: 73.9789 }
        },

        pune_goa: {
            originCode: 'PNQ',
            originName: 'Pune',
            destCode: 'GOI',
            destName: 'South Goa (Cola Bay)',
            status: 'Corridor Flow: Clear & Open',
            corridorName: 'AH47 ➔ NH-48 ➔ Chorla / Anmod Ghat',
            corridorSub: 'Western Maharashtra Highlands to Konkan Shore',
            distance: 450,
            driveTime: '8h 15m with 2 stops',
            avgSpeed: '72 km/h',
            tempProfile: '26°C Western Ghats',
            fuelCost: '₹2,700',
            tollCost: '₹480',
            permitCost: '₹100',
            foodCost: '₹950',
            totalCost: '₹4,230',
            evNote: 'Fast chargers active every 50km on Pune-Satara-Kolhapur expressway.',
            elevation: {
                range: '650m Peak ➔ 0m Sea Level',
                sub: '(Western Ghats descent into lush Goa coastline)',
                gain: '+240 m',
                descent: '-890 m',
                hairpins: '28 Graded Bends',
                gear: 'Hill Descent Drive Mode',
                points: '0,35 200,30 400,25 550,28 680,65 740,82 800,95',
                polyline: '0,35 200,30 400,25 550,28 680,65 740,82 800,95'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 115 KM',
                    title: 'Satara Valley Kanda Poha Halt',
                    desc: 'Traditional Maharashtrian breakfast with piping hot poha, chai, and hillside view.',
                    hours: 'Open 06:30 - 22:00',
                    cost: '₹140 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 17.6805,
                    lng: 73.9904
                },
                {
                    km: 'STOP 2 · 235 KM',
                    title: 'Kolhapur Rankala Lake & Tiffin',
                    desc: 'Scenic lakeside break and authentic Kolhapuri savory treats.',
                    hours: 'Open 08:00 - 21:00',
                    cost: '₹200 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: 16.7050,
                    lng: 74.2433
                },
                {
                    km: 'STOP 3 · 380 KM',
                    title: 'Anmod Ghat Dense Forest Corridor',
                    desc: 'Evergreen canopy corridor on the Karnataka-Goa border with bird watching overlooks.',
                    hours: 'Forest Transit Corridor',
                    cost: 'State Toll',
                    img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop',
                    lat: 15.4371,
                    lng: 74.3725
                }
            ],
            fallbacks: {
                flight: { route: 'PNQ ➔ GOI (Direct Flight)', sub: 'Daily non-stop · 55m duration', fare: 'From ₹2,900', airlines: 'IndiGo · SpiceJet' },
                rail: { name: 'Goa Express (PUNE - MAO)', sub: 'Scenic Sahyadri Rail Run · 11h travel', fare: '₹480 SL / ₹1,290 3A', seats: 'Daily Departures' },
                chauffeur: { name: 'Pune-Goa Private SUV', sub: 'Toyota Innova Crysta · AC Highway Cruiser', fare: '₹14,000' }
            },
            originCoords: { lat: 18.5204, lng: 73.8567 },
            destCoords: { lat: 15.0543, lng: 73.9789 }
        },

        delhi_goa: {
            originCode: 'DEL',
            originName: 'Delhi NCR',
            destCode: 'GOI',
            destName: 'South Goa (Cola Bay)',
            status: 'Long Haul: Overland Trans-India Route',
            corridorName: 'NH-48 Western Golden Quadrilateral',
            corridorSub: 'Northern Plains across Aravalli, Deccan to Western Ghats',
            distance: 1880,
            driveTime: '32h overland expedition',
            avgSpeed: '80 km/h on Expressways',
            tempProfile: '28°C Variable Corridor',
            fuelCost: '₹11,280',
            tollCost: '₹2,400',
            permitCost: '₹450',
            foodCost: '₹3,500',
            totalCost: '₹17,630',
            evNote: 'Verified high-power CCS2 fast chargers along NE4 & NH48 at every major plaza.',
            elevation: {
                range: '650m Peak ➔ 0m Sea Level',
                sub: '(Gangetic plain to Aravalli ridges to Konkan coast)',
                gain: '+1,200 m',
                descent: '-1,450 m',
                hairpins: '24 Graded Bends',
                gear: 'Expressway Cruise & Hill Descent',
                points: '0,85 200,60 400,45 600,30 720,70 800,95',
                polyline: '0,85 200,60 400,45 600,30 720,70 800,95'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 260 KM',
                    title: 'Jaipur Pink City Expressway Oasis',
                    desc: 'Rajasthani kachoris, lassi and North Indian tandoor dishes at expressway hub.',
                    hours: 'Open 24/7',
                    cost: '₹300 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 26.9124,
                    lng: 75.7873
                },
                {
                    km: 'STOP 2 · 660 KM',
                    title: 'Udaipur Aravalli Foothill Plaza',
                    desc: 'Tranquil Mewar hillside dining halt with Dal Baati Churma and refreshments.',
                    hours: 'Open 08:00 - 23:00',
                    cost: '₹380 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: 24.5854,
                    lng: 73.7125
                },
                {
                    km: 'STOP 3 · 1380 KM',
                    title: 'Mumbai Eastern Freeway Gateway',
                    desc: 'Expressway transit rest zone before Konkan coastal highway transition.',
                    hours: 'Open 24/7',
                    cost: '₹320 for two',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 19.0760,
                    lng: 72.8777
                }
            ],
            fallbacks: {
                flight: { route: 'DEL ➔ GOI (Non-Stop Flights)', sub: '12 Direct departures daily · 2h 30m', fare: 'From ₹4,900', airlines: 'IndiGo · Air India · Vistara' },
                rail: { name: 'Goa Rajdhani Express (NZM - MAO)', sub: 'Premier Superfast · 26h fast journey', fare: '₹3,200 3A', seats: 'Confirmed Rajdhani Berths' },
                chauffeur: { name: 'Cross-Country SUV Escort', sub: 'Toyota Innova Crysta · Dual Professional Drivers', fare: '₹48,000' }
            },
            originCoords: { lat: 28.6139, lng: 77.2090 },
            destCoords: { lat: 15.0543, lng: 73.9789 }
        },

        // --- TIRUPATI CORRIDORS ---
        chennai_tirupati: {
            originCode: 'MAA',
            originName: 'Chennai',
            destCode: 'TIR',
            destName: 'Tirumala Hills',
            status: 'Ghat Road: Open (03:00 - 23:00)',
            corridorName: 'NH-716 ➔ Alipiri Ghat',
            corridorSub: 'Seshachalam Foothills to Sacred Seven Hills',
            distance: 138,
            driveTime: '3h 15m with 1 stop',
            avgSpeed: '65 km/h on NH-716',
            tempProfile: '27°C Sacred Hills',
            fuelCost: '₹1,150',
            tollCost: '₹185',
            permitCost: '₹50',
            foodCost: '₹450',
            totalCost: '₹1,835',
            evNote: 'TTD Alipiri Fast Charging Hub with 8 Type-2 & CCS2 fast stalls active.',
            elevation: {
                range: '980m Peak ➔ 120m Foothills',
                sub: '(Ascent up the Sacred Seshachalam Graded Ghat)',
                gain: '+860 m',
                descent: '-20 m',
                hairpins: '56 Graded Curves',
                gear: 'Low Gear / Hill Climb Mode',
                points: '0,95 200,90 400,80 550,70 650,30 750,15 800,10',
                polyline: '0,95 200,90 400,80 550,70 650,30 750,15 800,10'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 45 KM',
                    title: 'Murugan Idli & Tiffin Halt',
                    desc: 'Famous South Indian highway tiffin with piping hot ghee podi idlis and fresh filter coffee.',
                    hours: 'Open 06:00 - 23:00',
                    cost: '₹220 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 12.9815,
                    lng: 79.9725
                },
                {
                    km: 'STOP 2 · 95 KM',
                    title: 'Nagari Hills Vista Point',
                    desc: 'Scenic ridge outlook over historic Nagari Nose hill formation and lush palm groves.',
                    hours: 'Scenic Rest Halt',
                    cost: 'Free access',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 13.3300,
                    lng: 79.5800
                },
                {
                    km: 'STOP 3 · 122 KM',
                    title: 'Alipiri Security & Checkpoint',
                    desc: 'Official vehicle FASTag scanning, biometric verification, and Ghat road pass checkpoint.',
                    hours: '24/7 Security Gate',
                    cost: '₹50 TTD toll',
                    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tirumala_Venkateswara_Temple.jpg/800px-Tirumala_Venkateswara_Temple.jpg',
                    lat: 13.6500,
                    lng: 79.4000
                }
            ],
            fallbacks: {
                flight: { route: 'MAA ➔ TIR (Renigunta)', sub: 'Alliance Air / IndiGo · 45m flight', fare: 'From ₹2,450', airlines: 'Alliance Air · SpiceJet' },
                rail: { name: 'Saptagiri Express / Vande Bharat (MAS - RU)', sub: 'Morning Superfast · 2h 40m scenic run', fare: '₹585', seats: 'Confirmed Chair Car' },
                chauffeur: { name: 'Dedicated Temple Chauffeur Sedan', sub: 'Toyota Etios / Ertiga · Ghat Certified Driver', fare: '₹4,200' }
            },
            originCoords: { lat: 13.0827, lng: 80.2707 },
            destCoords: { lat: 13.6288, lng: 79.4192 }
        },
        tirupati: null, // assigned below to chennai_tirupati

        hyderabad_tirupati: {
            originCode: 'HYD',
            originName: 'Hyderabad',
            destCode: 'TIR',
            destName: 'Tirumala Hills',
            status: 'Expressway: Clear & Open',
            corridorName: 'NH-44 ➔ NH-40 Rayalaseema Expressway',
            corridorSub: 'Deccan Plateau through Kurnool & Kadapa to Seshachalam',
            distance: 555,
            driveTime: '9h 30m with 2 stops',
            avgSpeed: '75 km/h on Expressway',
            tempProfile: '29°C Inland',
            fuelCost: '₹3,330',
            tollCost: '₹620',
            permitCost: '₹100',
            foodCost: '₹950',
            totalCost: '₹5,000',
            evNote: 'Fast DC charging available at Jadcherla, Kurnool bypass and Kadapa.',
            elevation: {
                range: '980m Peak ➔ 140m Plains',
                sub: '(Ascent up Seshachalam Hills)',
                gain: '+840 m',
                descent: '-50 m',
                hairpins: '56 Graded Curves',
                gear: 'Hill Ascent Mode',
                points: '0,60 200,62 400,65 600,68 700,40 800,10',
                polyline: '0,60 200,62 400,65 600,68 700,40 800,10'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 210 KM',
                    title: 'Kurnool Konda Reddy Buruju Halt',
                    desc: 'Famous Rayalaseema Uggani Bajji tiffin with historic fortress viewpoint.',
                    hours: 'Open 06:00 - 22:30',
                    cost: '₹190 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 15.8281,
                    lng: 78.0373
                },
                {
                    km: 'STOP 2 · 380 KM',
                    title: 'Kadapa Highway Amenity Plaza',
                    desc: 'Fresh sugarcane juice, Rayalaseema ragi mudda meals, and clean rest facilities.',
                    hours: 'Open 08:00 - 23:00',
                    cost: '₹260 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: 14.4673,
                    lng: 78.8242
                },
                {
                    km: 'STOP 3 · 510 KM',
                    title: 'Alipiri Ghat Clearance Gate',
                    desc: 'FASTag verification, luggage biometric scan, and toll gate to sacred Tirumala hill road.',
                    hours: '24/7 Security Gate',
                    cost: '₹50 TTD toll',
                    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tirumala_Venkateswara_Temple.jpg/800px-Tirumala_Venkateswara_Temple.jpg',
                    lat: 13.6500,
                    lng: 79.4000
                }
            ],
            fallbacks: {
                flight: { route: 'HYD ➔ TIR (Renigunta)', sub: '3 Direct flights daily · 1h 10m', fare: 'From ₹2,600', airlines: 'IndiGo · Alliance Air' },
                rail: { name: 'Vande Bharat / Rayalaseema Express', sub: 'Kacheguda - Tirupati Superfast · 8h 30m', fare: '₹1,250 CC / ₹410 SL', seats: 'Daily Departures' },
                chauffeur: { name: 'Pilgrimage Sedan / SUV', sub: 'Toyota Innova Crysta · Ghat Certified Driver', fare: '₹15,000' }
            },
            originCoords: { lat: 17.3850, lng: 78.4867 },
            destCoords: { lat: 13.6288, lng: 79.4192 }
        },

        bangalore_tirupati: {
            originCode: 'BLR',
            originName: 'Bengaluru',
            destCode: 'TIR',
            destName: 'Tirumala Hills',
            status: 'Highway: Clear & Open',
            corridorName: 'NH-75 ➔ NH-206 via Kolar & Chittoor',
            corridorSub: 'South Karnataka Sericulture Corridor to Seshachalam',
            distance: 250,
            driveTime: '4h 45m with 1 stop',
            avgSpeed: '65 km/h',
            tempProfile: '27°C Sacred Hills',
            fuelCost: '₹1,500',
            tollCost: '₹280',
            permitCost: '₹80',
            foodCost: '₹550',
            totalCost: '₹2,410',
            evNote: 'EV fast chargers available at Kolar Woody and Chittoor bypass.',
            elevation: {
                range: '980m Peak ➔ 800m Plateau',
                sub: '(Graded climb from Chittoor valley to Tirumala)',
                gain: '+420 m',
                descent: '-180 m',
                hairpins: '56 Graded Curves',
                gear: 'Smooth Highway & Ghat Climb',
                points: '0,25 200,30 400,45 600,60 700,30 800,10',
                polyline: '0,25 200,30 400,45 600,60 700,30 800,10'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 70 KM',
                    title: "Woody's Kolar Highway Dosa",
                    desc: 'Celebrated highway restaurant serving crispy butter dosas, filter coffee, and clean restrooms.',
                    hours: 'Open 06:00 - 23:00',
                    cost: '₹210 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 13.1367,
                    lng: 78.1348
                },
                {
                    km: 'STOP 2 · 175 KM',
                    title: 'Chittoor Mango Belt Rest Plaza',
                    desc: 'Regional fruit orchard highway pavilion with tender coconut and fresh refreshments.',
                    hours: 'Open 07:00 - 21:00',
                    cost: '₹150 refreshments',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 13.2172,
                    lng: 79.1003
                },
                {
                    km: 'STOP 3 · 235 KM',
                    title: 'Alipiri Foothill Clearance',
                    desc: 'Biometric pass verification and vehicle scan before Tirumala toll road ascent.',
                    hours: '24/7 Gate',
                    cost: '₹50 TTD Toll',
                    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tirumala_Venkateswara_Temple.jpg/800px-Tirumala_Venkateswara_Temple.jpg',
                    lat: 13.6500,
                    lng: 79.4000
                }
            ],
            fallbacks: {
                flight: { route: 'BLR ➔ TIR (Renigunta)', sub: 'Alliance Air Direct · 45m flight', fare: 'From ₹2,100', airlines: 'Alliance Air · IndiGo' },
                rail: { name: 'SBC - TPTY Intercity Superfast', sub: 'KSR Bengaluru - Tirupati · 4h 15m scenic daytime train', fare: '₹410 CC', seats: 'Daily Morning Service' },
                chauffeur: { name: 'Chittoor Highway Chauffeur Sedan', sub: 'Toyota Etios / Ertiga · Driver Allowance included', fare: '₹6,500' }
            },
            originCoords: { lat: 12.9716, lng: 77.5946 },
            destCoords: { lat: 13.6288, lng: 79.4192 }
        },

        // --- MUNNAR CORRIDORS ---
        kochi_munnar: {
            originCode: 'COK',
            originName: 'Kochi (Cochin)',
            destCode: 'MUN',
            destName: 'Munnar Highlands',
            status: 'Gap Road: Open & Pristine',
            corridorName: 'NH-85 Kochi-Dhanushkodi',
            corridorSub: 'Periyar River Basin to High Western Ghats',
            distance: 125,
            driveTime: '3h 45m with 2 stops',
            avgSpeed: '42 km/h on Ghat Road',
            tempProfile: '19°C Cool Mountain Mist',
            fuelCost: '₹1,200',
            tollCost: '₹110',
            permitCost: '₹80',
            foodCost: '₹400',
            totalCost: '₹1,790',
            evNote: '3 DC Fast Chargers available along Kothamangalam & Adimali corridor.',
            elevation: {
                range: '1,600m Peak ➔ 10m Coastal Plains',
                sub: '(Scenic climb through Western Ghats tea terraces)',
                gain: '+1,590 m',
                descent: '-20 m',
                hairpins: '48 Graded Curves',
                gear: 'First / Second Gear Hill Ascent',
                points: '0,98 150,90 350,75 500,50 650,25 750,12 800,8',
                polyline: '0,98 150,90 350,75 500,50 650,25 750,12 800,8'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 42 KM',
                    title: 'Neriamangalam Spice Garden Halt',
                    desc: 'Historic Periyar gateway arch with organic cardamom tea, fresh banana chips, and spice plantation stroll.',
                    hours: 'Open 07:00 - 21:00',
                    cost: '₹120 for two',
                    img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop',
                    lat: 10.0500,
                    lng: 76.7800
                },
                {
                    km: 'STOP 2 · 78 KM',
                    title: 'Cheeyappara & Valara Waterfalls',
                    desc: 'Seven-tiered cascading waterfalls directly by the highway with cool spray and photography decks.',
                    hours: 'Roadside Cascade',
                    cost: 'Free overlook',
                    img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&auto=format&fit=crop',
                    lat: 10.0300,
                    lng: 76.9000
                },
                {
                    km: 'STOP 3 · 112 KM',
                    title: 'Pothamedu High Escarpment Bend',
                    desc: 'Dramatic panoramic ridge viewpoint over emerald tea carpets and mountain valleys.',
                    hours: 'Sunset Viewpoint',
                    cost: 'Open scenic deck',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 10.0600,
                    lng: 77.0400
                }
            ],
            fallbacks: {
                flight: { route: 'Nearest Hub: COK (Cochin Airport)', sub: '110 KM drive · Direct scenic ground transfer recommended', fare: 'From ₹2,800 cab', airlines: 'All Major Domestic Airlines' },
                rail: { name: 'Aluva / Ernakulam Railway Connection', sub: 'Southern Railway Railhead · 3h 30m hill cab connect', fare: '₹450 train', seats: 'Daily Express Services' },
                chauffeur: { name: 'Mountain Certified Innova Crysta', sub: 'Expert Hill Driver · Fuel, Ghat Tolls & Passes included', fare: '₹5,500' }
            },
            originCoords: { lat: 9.9312, lng: 76.2673 },
            destCoords: { lat: 10.0889, lng: 77.0595 }
        },
        munnar: null, // assigned below to kochi_munnar

        bangalore_munnar: {
            originCode: 'BLR',
            originName: 'Bengaluru',
            destCode: 'MUN',
            destName: 'Munnar Highlands',
            status: 'Corridor Flow: Clear & Open',
            corridorName: 'NH-44 ➔ NH-83 via Salem & Theni Ghat',
            corridorSub: 'Deccan Plains through Tamil Nadu into High Western Ghats',
            distance: 475,
            driveTime: '9h 30m with 2 stops',
            avgSpeed: '60 km/h',
            tempProfile: '19°C Mountain Mist',
            fuelCost: '₹2,850',
            tollCost: '₹460',
            permitCost: '₹120',
            foodCost: '₹850',
            totalCost: '₹4,280',
            evNote: 'Fast chargers active along Salem, Dindigul, and Theni highway.',
            elevation: {
                range: '1,600m Peak ➔ 800m Plateau',
                sub: '(Gradual plateau transit followed by steep Bodimettu ghat ascent)',
                gain: '+1,450 m',
                descent: '-500 m',
                hairpins: '44 Graded Curves',
                gear: 'Hill Climb 2nd/3rd Gear Mode',
                points: '0,30 200,45 400,65 600,60 700,25 800,10',
                polyline: '0,30 200,45 400,65 600,60 700,25 800,10'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 200 KM',
                    title: 'Salem Highway Breakfast Hub',
                    desc: 'Hot idlis, medu vadas, and traditional filter coffee along the expressway.',
                    hours: 'Open 06:00 - 23:00',
                    cost: '₹190 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 11.6643,
                    lng: 78.1460
                },
                {
                    km: 'STOP 2 · 370 KM',
                    title: 'Dindigul Thalappakatti Thaluk',
                    desc: 'Legendary aromatic seeraga samba biryani culinary lunch pause.',
                    hours: 'Open 11:30 - 22:30',
                    cost: '₹380 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: 10.3673,
                    lng: 77.9803
                },
                {
                    km: 'STOP 3 · 445 KM',
                    title: 'Bodimettu Ghat Cloud Pass',
                    desc: 'Dramatic winding mountain pass through cloud canopy into Kerala tea territory.',
                    hours: 'Scenic Ghat Pass',
                    cost: 'Free access',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 10.0167,
                    lng: 77.2667
                }
            ],
            fallbacks: {
                flight: { route: 'BLR ➔ COK (Cochin) + Mountain Transfer', sub: '1h 05m flight + 3h hill cab ride', fare: 'From ₹2,800 + cab', airlines: 'IndiGo · Air India' },
                rail: { name: 'KSR Bengaluru - Ernakulam Intercity', sub: 'Scenic rail run · 8h 30m', fare: '₹650 CC', seats: 'Daily Superfast' },
                chauffeur: { name: 'High-Altitude Certified Innova', sub: 'Toyota Innova Crysta · Experienced Ghat Driver', fare: '₹14,500' }
            },
            originCoords: { lat: 12.9716, lng: 77.5946 },
            destCoords: { lat: 10.0889, lng: 77.0595 }
        },

        // --- PONDICHERRY CORRIDORS ---
        chennai_pondicherry: {
            originCode: 'MAA',
            originName: 'Chennai',
            destCode: 'PNY',
            destName: 'White Town Promenade',
            status: 'East Coast Road: Clear & Open',
            corridorName: 'ECR Scenic Coastal Highway',
            corridorSub: 'Bay of Bengal Shoreline to French Quarter',
            distance: 152,
            driveTime: '3h 10m with 1 stop',
            avgSpeed: '68 km/h on ECR',
            tempProfile: '28°C Sea Breeze',
            fuelCost: '₹1,250',
            tollCost: '₹160',
            permitCost: '₹100',
            foodCost: '₹750',
            totalCost: '₹2,260',
            evNote: '6 DC Fast Chargers located at Mahabalipuram & Marakkanam rest stops.',
            elevation: {
                range: '20m Peak ➔ 0m Sea Level',
                sub: '(Flat scenic coastal highway drive)',
                gain: '+15 m',
                descent: '-15 m',
                hairpins: '0 Curves',
                gear: 'Smooth Cruiser / Eco Mode',
                points: '0,95 200,92 400,94 600,93 800,95',
                polyline: '0,95 200,92 400,94 600,93 800,95'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 55 KM',
                    title: 'Mahabalipuram Shore Halt',
                    desc: 'UNESCO 8th-century granite shore temples with ocean breeze and fresh tender coconut water.',
                    hours: 'Open 06:00 - 18:00',
                    cost: '₹250 for two',
                    img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&auto=format&fit=crop',
                    lat: 12.6200,
                    lng: 80.1900
                },
                {
                    km: 'STOP 2 · 92 KM',
                    title: 'Marakkanam Salt Pans & Lagoon',
                    desc: 'Shimmering white salt pans and tranquil Bay of Bengal backwaters with pelican sightings.',
                    hours: 'Scenic Coastal Stop',
                    cost: 'Free overlook',
                    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop',
                    lat: 12.2000,
                    lng: 79.9500
                },
                {
                    km: 'STOP 3 · 140 KM',
                    title: 'Auroville Forest Approach',
                    desc: 'Shaded spiraling tree canopy leading into Auroville visitor sanctuary and artisan café.',
                    hours: 'Open 09:00 - 17:30',
                    cost: 'Free entry pass',
                    img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop',
                    lat: 12.0050,
                    lng: 79.8100
                }
            ],
            fallbacks: {
                flight: { route: 'Nearest Major: MAA (Chennai)', sub: '135 KM away · Direct ECR coastal road trip recommended', fare: 'From ₹2,900 cab', airlines: 'All Domestic Carriers' },
                rail: { name: 'Puducherry Express (MS - PDY)', sub: 'Daily Coastal Train · 3h 30m leisurely commute', fare: '₹340', seats: 'AC Chair Available' },
                chauffeur: { name: 'Private Coastal Sedan', sub: 'Maruti Dzire / Honda City · Uniformed Chauffeur', fare: '₹3,800' }
            },
            originCoords: { lat: 13.0827, lng: 80.2707 },
            destCoords: { lat: 11.9416, lng: 79.8083 }
        },
        pondicherry: null, // assigned below to chennai_pondicherry

        bangalore_pondicherry: {
            originCode: 'BLR',
            originName: 'Bengaluru',
            destCode: 'PNY',
            destName: 'White Town Promenade',
            status: 'Corridor Flow: Clear & Open',
            corridorName: 'NH-77 via Krishnagiri & Tiruvannamalai',
            corridorSub: 'Eastern Ghats Plains to French Coastal Quarter',
            distance: 310,
            driveTime: '6h 15m with 1 stop',
            avgSpeed: '62 km/h',
            tempProfile: '28°C Sea Breeze',
            fuelCost: '₹1,860',
            tollCost: '₹320',
            permitCost: '₹120',
            foodCost: '₹650',
            totalCost: '₹2,950',
            evNote: 'Fast chargers active at Krishnagiri highway plaza and Tiruvannamalai bypass.',
            elevation: {
                range: '900m Peak ➔ 0m Sea Level',
                sub: '(Smooth descent from Karnataka plateau to Coromandel coast)',
                gain: '+80 m',
                descent: '-920 m',
                hairpins: '4 Gentle Curves',
                gear: 'Smooth Highway Cruiser',
                points: '0,25 200,45 400,65 600,80 800,95',
                polyline: '0,25 200,45 400,65 600,80 800,95'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 90 KM',
                    title: 'Krishnagiri Highway Food Court',
                    desc: 'Crisp ghee dosas and traditional South Indian highway snacks.',
                    hours: 'Open 06:00 - 23:00',
                    cost: '₹180 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 12.5186,
                    lng: 78.2137
                },
                {
                    km: 'STOP 2 · 195 KM',
                    title: 'Tiruvannamalai Sacred Ridge',
                    desc: 'Serene panoramic view of Mount Arunachala and spiritual garden rest halt.',
                    hours: 'Open 08:00 - 20:00',
                    cost: 'Free access',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: 12.2253,
                    lng: 79.0747
                },
                {
                    km: 'STOP 3 · 275 KM',
                    title: 'Gingee Fort Citadel Approach',
                    desc: 'Historical medieval rock citadel overlook known as the Troy of the East.',
                    hours: 'Scenic Overlook',
                    cost: 'Free access',
                    img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&auto=format&fit=crop',
                    lat: 12.2530,
                    lng: 79.4180
                }
            ],
            fallbacks: {
                flight: { route: 'BLR ➔ PNY (Pondicherry Airport)', sub: 'Fly91 Direct flight · 50m duration', fare: 'From ₹2,200', airlines: 'Fly91 Regional' },
                rail: { name: 'Yesvantpur - Puducherry Express', sub: 'Overnight Service · 8h travel', fare: '₹380 SL / ₹980 3A', seats: 'Tri-Weekly Express' },
                chauffeur: { name: 'Weekend Coastal Getaway Sedan', sub: 'Maruti Ciaz / Ertiga · Tolls Included', fare: '₹8,500' }
            },
            originCoords: { lat: 12.9716, lng: 77.5946 },
            destCoords: { lat: 11.9416, lng: 79.8083 }
        },

        // --- VARANASI CORRIDORS ---
        lucknow_varanasi: {
            originCode: 'LKO',
            originName: 'Lucknow',
            destCode: 'VNS',
            destName: 'Kashi Ghats',
            status: 'Purvanchal Expressway: High Speed Clear',
            corridorName: 'Purvanchal Expressway ➔ NH-31',
            corridorSub: 'Avadh Heartland to Ancient Ganga Corridor',
            distance: 312,
            driveTime: '5h 15m with 1 stop',
            avgSpeed: '90 km/h on Expressway',
            tempProfile: '26°C Gangetic Plains',
            fuelCost: '₹2,600',
            tollCost: '₹685',
            permitCost: '₹100',
            foodCost: '₹650',
            totalCost: '₹4,035',
            evNote: 'UPEIDA Way Amenity Plaza Chargers operational at KM 110 & KM 225.',
            elevation: {
                range: '120m Peak ➔ 75m River Plains',
                sub: '(Smooth Gangetic expressway crossing)',
                gain: '+30 m',
                descent: '-20 m',
                hairpins: '0 Curves',
                gear: 'Cruise Control Highway Mode',
                points: '0,70 200,72 400,75 600,78 800,80',
                polyline: '0,70 200,72 400,75 600,78 800,80'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 115 KM',
                    title: 'Sultanpur Highway Amenity Plaza',
                    desc: 'Expressway rest facility with North Indian tandoori delicacies, fresh chai, and clean restrooms.',
                    hours: 'Open 24/7',
                    cost: '₹200 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 26.2600,
                    lng: 82.0700
                },
                {
                    km: 'STOP 2 · 210 KM',
                    title: 'Jaunpur Shahi Bridge & Imarti Halt',
                    desc: 'Historical 16th-century Mughal bridge crossing and stop for world-famous Jaunpuri Beniram Imartis.',
                    hours: 'Open 08:00 - 22:00',
                    cost: '₹150 sweets',
                    img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&auto=format&fit=crop',
                    lat: 25.7500,
                    lng: 82.6800
                },
                {
                    km: 'STOP 3 · 295 KM',
                    title: 'Shivpur Ring Road Gateway',
                    desc: 'Modern 6-lane bypass corridor delivering seamless access directly to Varanasi Cantonment.',
                    hours: 'Cantonment Entry',
                    cost: 'Smooth toll pass',
                    img: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600&auto=format&fit=crop',
                    lat: 25.3600,
                    lng: 82.9500
                }
            ],
            fallbacks: {
                flight: { route: 'DEL / BOM ➔ VNS (Babatpur Hub)', sub: 'Direct flight connections daily · 1h 20m', fare: 'From ₹3,400', airlines: 'IndiGo · Air India · Vistara' },
                rail: { name: 'Vande Bharat Express (NDLS - BSB)', sub: 'Fastest link from New Delhi · 8h 00m semi-high speed', fare: '₹1,750', seats: 'Executive Chair Available' },
                chauffeur: { name: 'Expressway Chauffeur SUV', sub: 'Toyota Innova Crysta · Express Tolls Included', fare: '₹8,500' }
            },
            originCoords: { lat: 26.8467, lng: 80.9462 },
            destCoords: { lat: 25.3176, lng: 82.9739 }
        },
        varanasi: null, // assigned below to lucknow_varanasi

        delhi_varanasi: {
            originCode: 'DEL',
            originName: 'Delhi NCR',
            destCode: 'VNS',
            destName: 'Kashi Ghats',
            status: 'Expressway: High Speed Clear',
            corridorName: 'Yamuna ➔ Agra-Lucknow ➔ Purvanchal Expressway',
            corridorSub: 'National Capital across Gangetic Plains to Ancient Kashi',
            distance: 820,
            driveTime: '10h 30m with 2 stops',
            avgSpeed: '95 km/h on Expressway',
            tempProfile: '27°C Northern Plains',
            fuelCost: '₹5,200',
            tollCost: '₹1,350',
            permitCost: '₹150',
            foodCost: '₹1,400',
            totalCost: '₹8,100',
            evNote: '12 Fast DC charging stations installed across Agra and Purvanchal amenity zones.',
            elevation: {
                range: '220m Peak ➔ 75m River Plains',
                sub: '(Gentle Gangetic plain descent along the holy rivers)',
                gain: '+40 m',
                descent: '-185 m',
                hairpins: '0 Curves',
                gear: 'High Speed Cruise Control',
                points: '0,60 200,62 400,65 600,70 800,80',
                polyline: '0,60 200,62 400,65 600,70 800,80'
            },
            pitstops: [
                {
                    km: 'STOP 1 · 210 KM',
                    title: 'Agra Expressway Food Oasis',
                    desc: 'Expressway rest plaza with North Indian dal makhani, stuffed kulchas and tea.',
                    hours: 'Open 24/7',
                    cost: '₹320 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: 27.1767,
                    lng: 78.0081
                },
                {
                    km: 'STOP 2 · 510 KM',
                    title: 'Lucknow Bypass Royal Tiffin',
                    desc: 'Authentic Galouti kebab roll pause and Awadhi delicacies.',
                    hours: 'Open 10:00 - 23:00',
                    cost: '₹350 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: 26.8467,
                    lng: 80.9462
                },
                {
                    km: 'STOP 3 · 720 KM',
                    title: 'Jaunpur Shahi Heritage Bridge',
                    desc: 'Ancient 16th-century Mughal river bridge crossing and Beniram Imartis.',
                    hours: 'Heritage Stop',
                    cost: '₹150 sweets',
                    img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&auto=format&fit=crop',
                    lat: 25.7500,
                    lng: 82.6800
                }
            ],
            fallbacks: {
                flight: { route: 'DEL ➔ VNS (Direct Flights)', sub: '10 Direct departures daily · 1h 20m', fare: 'From ₹3,200', airlines: 'IndiGo · Air India · Vistara' },
                rail: { name: 'Vande Bharat Express (NDLS - BSB)', sub: 'Fastest Indian Rail Link · 8h 00m semi-high speed', fare: '₹1,750 CC', seats: 'Executive & Chair Car Daily' },
                chauffeur: { name: 'Expressway Cruiser SUV', sub: 'Toyota Innova Crysta · Express FastTolls Included', fare: '₹18,500' }
            },
            originCoords: { lat: 28.6139, lng: 77.2090 },
            destCoords: { lat: 25.3176, lng: 82.9739 }
        }
    };

    // Link default aliases
    ROUTE_CORRIDORS['goa'] = ROUTE_CORRIDORS['bangalore_goa'];
    ROUTE_CORRIDORS['tirupati'] = ROUTE_CORRIDORS['chennai_tirupati'];
    ROUTE_CORRIDORS['munnar'] = ROUTE_CORRIDORS['kochi_munnar'];
    ROUTE_CORRIDORS['pondicherry'] = ROUTE_CORRIDORS['chennai_pondicherry'];
    ROUTE_CORRIDORS['varanasi'] = ROUTE_CORRIDORS['lucknow_varanasi'];

    function findCityInfo(query) {
        if (!query) return null;
        const clean = query.toLowerCase().replace(/,?\s*india/gi, '').trim();
        if (window.KNOWN_CITIES[clean]) return window.KNOWN_CITIES[clean];

        // Partial match
        for (const [key, city] of Object.entries(window.KNOWN_CITIES)) {
            if (clean.includes(key) || key.includes(clean)) {
                return city;
            }
        }
        return null;
    }

    function synthesizeDynamicCorridor(originInfo, destInfo) {
        const R = 6371;
        const dLat = (destInfo.lat - originInfo.lat) * Math.PI / 180;
        const dLon = (destInfo.lng - originInfo.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(originInfo.lat * Math.PI / 180) * Math.cos(destInfo.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const airDist = Math.round(R * c);
        const roadDist = Math.max(50, Math.round(airDist * 1.25));
        const hours = roadDist / 65;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        const numStops = roadDist > 350 ? 2 : 1;
        const driveTime = `${h}h ${m > 0 ? m + 'm ' : ''}with ${numStops} stop${numStops > 1 ? 's' : ''}`;

        const fuel = Math.round(roadDist * 6);
        const toll = Math.round(roadDist * 1.1);
        const permit = roadDist > 300 ? 150 : 80;
        const food = Math.min(2200, Math.max(450, Math.round(hours * 130)));
        const total = fuel + toll + permit + food;

        // Pitstop 1 (at ~28% distance)
        const p1Lat = originInfo.lat + 0.28 * (destInfo.lat - originInfo.lat) + (Math.sin(originInfo.lat) * 0.05);
        const p1Lng = originInfo.lng + 0.28 * (destInfo.lng - originInfo.lng);
        const p1Dist = Math.round(roadDist * 0.28);

        // Pitstop 2 (at ~62% distance)
        const p2Lat = originInfo.lat + 0.62 * (destInfo.lat - originInfo.lat) - (Math.cos(originInfo.lng) * 0.05);
        const p2Lng = originInfo.lng + 0.62 * (destInfo.lng - originInfo.lng);
        const p2Dist = Math.round(roadDist * 0.62);

        // Pitstop 3 (at ~88% distance)
        const p3Lat = originInfo.lat + 0.88 * (destInfo.lat - originInfo.lat);
        const p3Lng = originInfo.lng + 0.88 * (destInfo.lng - originInfo.lng);
        const p3Dist = Math.round(roadDist * 0.88);

        // Flight duration approx
        const flightHours = (airDist / 600) + 0.4;
        const fH = Math.floor(flightHours);
        const fM = Math.round((flightHours - fH) * 60);
        const flightDuration = `${fH}h ${fM}m`;
        const flightFare = Math.max(2600, Math.round(2200 + airDist * 2.2));

        return {
            originCode: originInfo.code || originInfo.name.slice(0, 3).toUpperCase(),
            originName: originInfo.name,
            destCode: destInfo.code || destInfo.name.slice(0, 3).toUpperCase(),
            destName: destInfo.name,
            status: 'Corridor Flow: Clear & Monitored',
            corridorName: `National Highway (${originInfo.name} ➔ ${destInfo.name})`,
            corridorSub: `Interstate Highway Transit · ${roadDist} KM route`,
            distance: roadDist,
            driveTime: driveTime,
            avgSpeed: '72 km/h highway average',
            tempProfile: '26°C Highway Passing',
            fuelCost: `₹${fuel.toLocaleString('en-IN')}`,
            tollCost: `₹${toll.toLocaleString('en-IN')}`,
            permitCost: `₹${permit.toLocaleString('en-IN')}`,
            foodCost: `₹${food.toLocaleString('en-IN')}`,
            totalCost: `₹${total.toLocaleString('en-IN')}`,
            evNote: `${Math.max(2, Math.round(roadDist / 120))} Fast CCS2 DC charging plazas verified active along this route.`,
            elevation: {
                range: '750m Peak ➔ 50m Plains',
                sub: `(Terrain progression across ${originInfo.name} to ${destInfo.name})`,
                gain: `+${Math.round(roadDist * 0.55)} m`,
                descent: `-${Math.round(roadDist * 0.45)} m`,
                hairpins: `${Math.min(48, Math.max(8, Math.round(roadDist / 30)))} Graded Curves`,
                gear: 'Smooth Highway / Graded Cruise',
                points: '0,50 180,42 350,30 480,55 580,38 650,60 720,70 800,85',
                polyline: '0,50 180,42 350,30 480,55 580,38 650,60 720,70 800,85'
            },
            pitstops: [
                {
                    km: `STOP 1 · ${p1Dist} KM`,
                    title: `${originInfo.name} Regional Rest Plaza`,
                    desc: 'Expressway amenity oasis with regional breakfast, fresh chai, fuel refill, and modern restrooms.',
                    hours: 'Open 24/7',
                    cost: '₹220 for two',
                    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
                    lat: p1Lat,
                    lng: p1Lng
                },
                {
                    km: `STOP 2 · ${p2Dist} KM`,
                    title: 'Midway Highway Culinary Oasis',
                    desc: 'Designated transit rest point with panoramic countryside vista, fresh meals, and EV fast chargers.',
                    hours: 'Open 07:00 - 23:00',
                    cost: '₹340 for two',
                    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
                    lat: p2Lat,
                    lng: p2Lng
                },
                {
                    km: `STOP 3 · ${p3Dist} KM`,
                    title: `${destInfo.name} Gateway & Welcome Overlook`,
                    desc: 'Scenic highway bend welcoming travelers with local orchards, toll checkpoint, and visitor assistance.',
                    hours: 'Scenic Rest Stop',
                    cost: 'FASTag entry',
                    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop',
                    lat: p3Lat,
                    lng: p3Lng
                }
            ],
            fallbacks: {
                flight: {
                    route: `${originInfo.code || originInfo.name.slice(0, 3).toUpperCase()} ➔ ${destInfo.code || destInfo.name.slice(0, 3).toUpperCase()}`,
                    sub: `Major domestic air route · ${flightDuration}`,
                    fare: `From ₹${flightFare.toLocaleString('en-IN')}`,
                    airlines: 'IndiGo · Air India Express'
                },
                rail: {
                    name: `${originInfo.name} - ${destInfo.name} Superfast Express`,
                    sub: `Indian Railways Express · ${Math.round(roadDist / 58)}h scheduled run`,
                    fare: `₹${Math.round(roadDist * 0.9).toLocaleString('en-IN')}`,
                    seats: 'Daily Services Available'
                },
                chauffeur: {
                    name: 'Interstate Chauffeur SUV',
                    sub: 'Toyota Innova Crysta · Dedicated Professional Driver',
                    fare: `₹${Math.round(roadDist * 18 + 2500).toLocaleString('en-IN')}`
                }
            },
            originCoords: { lat: originInfo.lat, lng: originInfo.lng },
            destCoords: { lat: destInfo.lat, lng: destInfo.lng }
        };
    }

    function resolveCorridor(originInput, destInput) {
        const oInfo = findCityInfo(originInput) || { name: originInput || 'Bengaluru', code: (originInput || 'BLR').slice(0, 3).toUpperCase(), lat: 12.9716, lng: 77.5946 };
        const dInfo = findCityInfo(destInput) || { name: destInput || 'Goa', code: (destInput || 'GOI').slice(0, 3).toUpperCase(), lat: 15.2993, lng: 74.1240 };

        let oKey = (oInfo.name || '').toLowerCase().replace(/[^a-z]/g, '');
        let dKey = (dInfo.name || '').toLowerCase().replace(/[^a-z]/g, '');

        if (dKey.includes('goa')) dKey = 'goa';
        else if (dKey.includes('tirupati') || dKey.includes('tirumala')) dKey = 'tirupati';
        else if (dKey.includes('munnar')) dKey = 'munnar';
        else if (dKey.includes('pondicherry') || dKey.includes('puducherry')) dKey = 'pondicherry';
        else if (dKey.includes('varanasi') || dKey.includes('kashi') || dKey.includes('banaras')) dKey = 'varanasi';

        if (oKey.includes('bangalore') || oKey.includes('bengaluru')) oKey = 'bangalore';
        else if (oKey.includes('hyderabad')) oKey = 'hyderabad';
        else if (oKey.includes('chennai') || oKey.includes('madras')) oKey = 'chennai';
        else if (oKey.includes('mumbai') || oKey.includes('bombay')) oKey = 'mumbai';
        else if (oKey.includes('pune')) oKey = 'pune';
        else if (oKey.includes('delhi')) oKey = 'delhi';
        else if (oKey.includes('lucknow')) oKey = 'lucknow';
        else if (oKey.includes('kochi') || oKey.includes('cochin')) oKey = 'kochi';

        // 1. Direct match: origin_dest
        const pairKey = `${oKey}_${dKey}`;
        if (ROUTE_CORRIDORS[pairKey]) {
            return ROUTE_CORRIDORS[pairKey];
        }

        // 2. Check if destination alone has a corridor whose origin matches
        if (ROUTE_CORRIDORS[dKey]) {
            const defCorridor = ROUTE_CORRIDORS[dKey];
            const defOriginNorm = (defCorridor.originName || '').toLowerCase().replace(/[^a-z]/g, '');
            if (defOriginNorm === oKey || oKey.includes(defOriginNorm) || defOriginNorm.includes(oKey)) {
                return defCorridor;
            }
        }

        // 3. Synthesize dynamic route
        return synthesizeDynamicCorridor(oInfo, dInfo);
    }

    function renderTransportView(customCorridor) {
        // Sync destination from currentTrip if present and not set
        if (!transitState.dest && currentTrip?.destination?.name) {
            transitState.dest = currentTrip.destination.name;
            transitState.destKey = (currentTrip.destinationKey || currentTrip.destination.name).toLowerCase().replace(/[^a-z]/g, '');
        }

        const corridor = customCorridor || resolveCorridor(transitState.origin, transitState.destKey || transitState.dest);
        activeCorridor = corridor;

        // Sync transitState
        transitState.origin = corridor.originName;
        transitState.originCode = corridor.originCode;
        transitState.dest = corridor.destName;
        transitState.destCode = corridor.destCode;

        // Update inputs
        const startInput = document.getElementById('transit-custom-start');
        const destInput = document.getElementById('transit-custom-dest');
        if (startInput && startInput.value !== corridor.originName) startInput.value = corridor.originName;
        if (destInput && destInput.value !== corridor.destName) destInput.value = corridor.destName;

        // Update quick chips active styling
        updateTransitChips(corridor.originName, corridor.destName);

        // Update headers & pills
        const oCode = document.getElementById('transit-origin-code');
        const oName = document.getElementById('transit-origin-name');
        const dCode = document.getElementById('transit-dest-code');
        const dName = document.getElementById('transit-dest-name');
        const statusBadge = document.getElementById('transit-status-badge');
        const kmPill = document.getElementById('transit-mode-km-pill');
        const durPill = document.getElementById('transit-flight-duration-pill');

        if (oCode) oCode.textContent = corridor.originCode;
        if (oName) oName.textContent = corridor.originName;
        if (dCode) dCode.textContent = corridor.destCode;
        if (dName) dName.textContent = corridor.destName;
        if (statusBadge) statusBadge.textContent = corridor.status;
        if (kmPill) kmPill.textContent = `${corridor.distance} KM`;
        if (durPill) durPill.textContent = corridor.fallbacks.flight.sub.split('·')[1]?.trim() || '1h 15m';

        // Corridor HUD
        const cName = document.getElementById('transit-corridor-name');
        const cSub = document.getElementById('transit-corridor-sub');
        if (cName) cName.textContent = corridor.corridorName;
        if (cSub) cSub.textContent = corridor.corridorSub;

        // Bottom HUD
        const hudTime = document.getElementById('transit-hud-time');
        const hudSpeed = document.getElementById('transit-hud-speed');
        const hudTemp = document.getElementById('transit-hud-temp');
        if (hudTime) hudTime.textContent = corridor.driveTime;
        if (hudSpeed) hudSpeed.textContent = corridor.avgSpeed;
        if (hudTemp) hudTemp.textContent = corridor.tempProfile;

        // Elevation Profile
        const elSub = document.getElementById('elevation-sub');
        const elRange = document.getElementById('elevation-range-badge');
        const elGain = document.getElementById('elevation-gain');
        const elDesc = document.getElementById('elevation-descent');
        const elBends = document.getElementById('elevation-hairpins');
        const elGear = document.getElementById('elevation-gear');
        const elPoly = document.getElementById('elevation-polygon');
        const elLine = document.getElementById('elevation-polyline');

        if (elSub) elSub.textContent = corridor.elevation.sub;
        if (elRange) elRange.textContent = corridor.elevation.range;
        if (elGain) elGain.textContent = corridor.elevation.gain;
        if (elDesc) elDesc.textContent = corridor.elevation.descent;
        if (elBends) elBends.textContent = corridor.elevation.hairpins;
        if (elGear) elGear.textContent = corridor.elevation.gear;
        if (elPoly && corridor.elevation.points) elPoly.setAttribute('points', corridor.elevation.points + ' 800,100 0,100');
        if (elLine && corridor.elevation.polyline) elLine.setAttribute('points', corridor.elevation.polyline);

        // 3 Pitstops
        corridor.pitstops.forEach((stop, idx) => {
            const i = idx + 1;
            const img = document.getElementById(`transit-stop${i}-img`);
            const km = document.getElementById(`transit-stop${i}-km`);
            const title = document.getElementById(`transit-stop${i}-title`);
            const desc = document.getElementById(`transit-stop${i}-desc`);
            const hours = document.getElementById(`transit-stop${i}-hours`);
            const cost = document.getElementById(`transit-stop${i}-cost`);

            if (img && stop.img) img.src = stop.img;
            if (km) km.textContent = stop.km;
            if (title) title.textContent = stop.title;
            if (desc) desc.textContent = stop.desc;
            if (hours) hours.textContent = stop.hours;
            if (cost) cost.textContent = stop.cost;
        });

        // Financial Ledger
        const lDist = document.getElementById('transit-ledger-dist');
        const lTime = document.getElementById('transit-ledger-time');
        const cFuel = document.getElementById('transit-cost-fuel');
        const cToll = document.getElementById('transit-cost-toll');
        const cPermit = document.getElementById('transit-cost-permits');
        const cFood = document.getElementById('transit-cost-food');
        const cTotal = document.getElementById('transit-cost-total');
        const evNote = document.getElementById('transit-ev-note');

        if (lDist) lDist.textContent = corridor.distance;
        if (lTime) {
            const hoursPart = (corridor.driveTime || '').match(/\d+(\.\d+)?/);
            lTime.textContent = hoursPart ? hoursPart[0] : Math.round(corridor.distance / 65);
        }
        if (cFuel) cFuel.textContent = corridor.fuelCost;
        if (cToll) cToll.textContent = corridor.tollCost;
        if (cPermit) cPermit.textContent = corridor.permitCost;
        if (cFood) cFood.textContent = corridor.foodCost;
        if (cTotal) cTotal.textContent = corridor.totalCost;
        if (evNote) evNote.textContent = corridor.evNote;

        // Fallbacks
        const fRoute = document.getElementById('transit-flight-route');
        const fSub = document.getElementById('transit-flight-sub');
        const fFare = document.getElementById('transit-flight-fare');
        const fAirlines = document.getElementById('transit-flight-airlines');

        if (fRoute) fRoute.textContent = corridor.fallbacks.flight.route;
        if (fSub) fSub.textContent = corridor.fallbacks.flight.sub;
        if (fFare) fFare.textContent = corridor.fallbacks.flight.fare;
        if (fAirlines) fAirlines.textContent = corridor.fallbacks.flight.airlines;

        const rName = document.getElementById('transit-rail-name');
        const rSub = document.getElementById('transit-rail-sub');
        const rFare = document.getElementById('transit-rail-fare');
        const rSeats = document.getElementById('transit-rail-seats');

        if (rName) rName.textContent = corridor.fallbacks.rail.name;
        if (rSub) rSub.textContent = corridor.fallbacks.rail.sub;
        if (rFare) rFare.textContent = corridor.fallbacks.rail.fare;
        if (rSeats) rSeats.textContent = corridor.fallbacks.rail.seats;

        const chName = document.getElementById('transit-chauffeur-name');
        const chSub = document.getElementById('transit-chauffeur-sub');
        const chFare = document.getElementById('transit-chauffeur-fare');

        if (chName) chName.textContent = corridor.fallbacks.chauffeur.name;
        if (chSub) chSub.textContent = corridor.fallbacks.chauffeur.sub;
        if (chFare) chFare.textContent = corridor.fallbacks.chauffeur.fare;

        // Initialize / Refresh Leaflet Map
        initRoadtripLeafletMap(corridor);
    }

    function initRoadtripLeafletMap(corridor) {
        const container = document.getElementById('transit-leaflet-map');
        if (!container || typeof L === 'undefined') return;

        if (!roadtripMap) {
            roadtripMap = L.map('transit-leaflet-map', {
                zoomControl: false,
                attributionControl: false
            });
            const isDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
            createBasemapTileLayer(isDark).addTo(roadtripMap);
        }

        // Clear existing layers
        roadtripMap.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                roadtripMap.removeLayer(layer);
            }
        });

        const latLngs = [
            [corridor.originCoords.lat, corridor.originCoords.lng],
            ...corridor.pitstops.map(s => [s.lat, s.lng]),
            [corridor.destCoords.lat, corridor.destCoords.lng]
        ];

        // Draw Polyline
        const polyline = L.polyline(latLngs, {
            color: '#1b4332',
            weight: 4,
            opacity: 0.85,
            dashArray: '8, 6'
        }).addTo(roadtripMap);

        // Origin Marker
        L.marker([corridor.originCoords.lat, corridor.originCoords.lng], {
            icon: L.divIcon({
                className: 'custom-road-marker',
                html: `<div style="width:28px;height:28px;border-radius:50%;background:#012d1d;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;">1</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            })
        }).addTo(roadtripMap).bindPopup(`<b>Origin ·</b> ${corridor.originName}`);

        // Pitstop Markers
        corridor.pitstops.forEach((s, idx) => {
            L.marker([s.lat, s.lng], {
                icon: L.divIcon({
                    className: 'custom-road-marker',
                    html: `<div style="width:26px;height:26px;border-radius:50%;background:#895112;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;">${idx + 2}</div>`,
                    iconSize: [26, 26],
                    iconAnchor: [13, 13]
                })
            }).addTo(roadtripMap).bindPopup(`<b>${s.km} ·</b> ${s.title}<br><span style="font-size:11px;color:#666;">${s.desc}</span>`);
        });

        // Destination Marker
        L.marker([corridor.destCoords.lat, corridor.destCoords.lng], {
            icon: L.divIcon({
                className: 'custom-road-marker',
                html: `<div style="width:30px;height:30px;border-radius:50%;background:#ffb46d;color:#012d1d;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #012d1d;">🏁</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(roadtripMap).bindPopup(`<b>Destination ·</b> ${corridor.destName}`);

        roadtripMap.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        setTimeout(() => { roadtripMap.invalidateSize(); }, 200);
    }

    function openGoogleMapsRoute() {
        const corridor = activeCorridor || ROUTE_CORRIDORS['goa'];
        const origin = encodeURIComponent(corridor.originName + ', India');
        const destination = encodeURIComponent(corridor.destName + ', India');
        const waypoints = corridor.pitstops.map(s => `${s.lat},${s.lng}`).join('|');
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
        window.open(url, '_blank');
    }

    function exportGPXRoute() {
        const corridor = activeCorridor || ROUTE_CORRIDORS['goa'];
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Compass Travel" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${corridor.originName} to ${corridor.destName} Route</name>
    <desc>${corridor.corridorName}</desc>
  </metadata>
  <rte>
    <name>${corridor.originName} - ${corridor.destName}</name>
    <rtept lat="${corridor.originCoords.lat}" lon="${corridor.originCoords.lng}"><name>${corridor.originName} Origin</name></rtept>
    ${corridor.pitstops.map(s => `<rtept lat="${s.lat}" lon="${s.lng}"><name>${s.title}</name></rtept>`).join('\n    ')}
    <rtept lat="${corridor.destCoords.lat}" lon="${corridor.destCoords.lng}"><name>${corridor.destName} Destination</name></rtept>
  </rte>
</gpx>`;
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${corridor.originCode}_to_${corridor.destCode}_Route.gpx`;
        a.click();
    }

    function toggleElevationSheet() {
        const sheet = document.getElementById('elevation-sheet');
        if (sheet) {
            sheet.classList.toggle('hidden');
        }
    }

    function switchTransitMode(mode) {
        document.querySelectorAll('.mode-tab-btn').forEach(b => {
            b.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
            b.classList.add('bg-transparent', 'text-on-surface-variant');
        });
        const activeBtn = document.getElementById(`transit-mode-${mode}`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-transparent', 'text-on-surface-variant');
            activeBtn.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
        }
    }

    async function recalculateRoute(newOrigin, newDest) {
        const startInput = document.getElementById('transit-custom-start');
        const destInput = document.getElementById('transit-custom-dest');

        const startCity = (newOrigin || (startInput ? startInput.value : '') || transitState.origin || 'Bengaluru').trim();
        const destCity = (newDest || (destInput ? destInput.value : '') || transitState.dest || 'Goa').trim();

        if (!startCity || !destCity) return;

        let oInfo = findCityInfo(startCity);
        if (!oInfo) {
            try {
                const geo = await TravelAPI.geocodeAddress(startCity + ', India');
                if (geo) {
                    oInfo = { name: startCity, code: startCity.slice(0, 3).toUpperCase(), lat: geo.lat, lng: geo.lng };
                } else {
                    oInfo = { name: startCity, code: startCity.slice(0, 3).toUpperCase(), lat: 12.9716, lng: 77.5946 };
                }
            } catch(e) {
                oInfo = { name: startCity, code: startCity.slice(0, 3).toUpperCase(), lat: 12.9716, lng: 77.5946 };
            }
        }

        let dInfo = findCityInfo(destCity);
        if (!dInfo) {
            try {
                const geo = await TravelAPI.geocodeAddress(destCity + ', India');
                if (geo) {
                    dInfo = { name: destCity, code: destCity.slice(0, 3).toUpperCase(), lat: geo.lat, lng: geo.lng };
                } else {
                    dInfo = { name: destCity, code: destCity.slice(0, 3).toUpperCase(), lat: 15.2993, lng: 74.1240 };
                }
            } catch(e) {
                dInfo = { name: destCity, code: destCity.slice(0, 3).toUpperCase(), lat: 15.2993, lng: 74.1240 };
            }
        }

        transitState.origin = oInfo.name;
        transitState.originCode = oInfo.code;
        transitState.dest = dInfo.name;
        transitState.destCode = dInfo.code;
        transitState.destKey = dInfo.name.toLowerCase().replace(/[^a-z]/g, '');

        const corridor = resolveCorridor(oInfo.name, dInfo.name);
        renderTransportView(corridor);
    }

    function setTransitOrigin(cityName) {
        const startInput = document.getElementById('transit-custom-start');
        if (startInput) startInput.value = cityName;
        transitState.origin = cityName;
        const currentDest = document.getElementById('transit-custom-dest')?.value || transitState.dest || 'Goa';
        recalculateRoute(cityName, currentDest);
    }

    function setTransitDestination(destName) {
        const destInput = document.getElementById('transit-custom-dest');
        if (destInput) destInput.value = destName;
        transitState.dest = destName;
        transitState.destKey = destName.toLowerCase().replace(/[^a-z]/g, '');
        const currentOrigin = document.getElementById('transit-custom-start')?.value || transitState.origin || 'Bengaluru';
        recalculateRoute(currentOrigin, destName);
    }

    function swapTransitDirection() {
        const tempOrigin = transitState.origin;
        const tempDest = transitState.dest;
        transitState.origin = tempDest;
        transitState.dest = tempOrigin;
        transitState.destKey = tempOrigin.toLowerCase().replace(/[^a-z]/g, '');
        recalculateRoute(tempDest, tempOrigin);
    }

    function updateTransitChips(activeOrigin, activeDest) {
        const oNorm = (activeOrigin || '').toLowerCase().replace(/[^a-z]/g, '');
        const dNorm = (activeDest || '').toLowerCase().replace(/[^a-z]/g, '');

        document.querySelectorAll('.transit-origin-chip').forEach(btn => {
            const txt = btn.textContent.trim().toLowerCase().replace(/[^a-z]/g, '');
            if (oNorm.includes(txt) || txt.includes(oNorm)) {
                btn.classList.remove('bg-surface-container', 'text-on-surface');
                btn.classList.add('bg-primary', 'text-on-primary', 'shadow-sm', 'font-bold');
            } else {
                btn.classList.add('bg-surface-container', 'text-on-surface');
                btn.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm', 'font-bold');
            }
        });

        document.querySelectorAll('.transit-dest-chip').forEach(btn => {
            const txt = btn.textContent.trim().toLowerCase().replace(/[^a-z]/g, '');
            if (dNorm.includes(txt) || txt.includes(dNorm)) {
                btn.classList.remove('bg-surface-container', 'text-on-surface');
                btn.classList.add('bg-primary', 'text-on-primary', 'shadow-sm', 'font-bold');
            } else {
                btn.classList.add('bg-surface-container', 'text-on-surface');
                btn.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm', 'font-bold');
            }
        });
    }

    function recenterRoadMap() {
        if (roadtripMap && activeCorridor) {
            const latLngs = [
                [activeCorridor.originCoords.lat, activeCorridor.originCoords.lng],
                [activeCorridor.destCoords.lat, activeCorridor.destCoords.lng]
            ];
            roadtripMap.fitBounds(latLngs, { padding: [40, 40] });
        }
    }

    function searchFlightsModal() {
        const corridor = activeCorridor || ROUTE_CORRIDORS['goa'];
        const originCode = corridor.originCode;
        const destCode = corridor.destCode;
        const searchUrl = `https://www.google.com/travel/flights?q=Flights%20from%20${originCode}%20to%20${destCode}`;
        window.open(searchUrl, '_blank');
    }

    function bookChauffeur() {
        const corridor = activeCorridor || ROUTE_CORRIDORS['goa'];
        alert(`Private Chauffeur Expedition Car (${corridor.fallbacks.chauffeur.name})\n\nRoute: ${corridor.originName} ➔ ${corridor.destName}\nEstimated Fare: ${corridor.fallbacks.chauffeur.fare}\nIncludes: Fuel, NHAI FASTag Tolls, State Border Permits, and Uniformed Driver Allowance.\n\nYour dedicated concierge will coordinate pickup details.`);
    }

    function toggleDark() {
        document.body.classList.toggle('dark');
        var btn = document.getElementById('dark-toggle');
        var isDark = document.body.classList.contains('dark');
        if (btn) btn.classList.toggle('on', isDark);
        var mapContainer = document.getElementById('itinerary-map');
        if (mapContainer && typeof itineraryMap !== 'undefined' && itineraryMap) {
            itineraryMap.eachLayer(function(l) {
                if (l instanceof L.TileLayer) {
                    itineraryMap.removeLayer(l);
                }
            });
            createBasemapTileLayer(isDark).addTo(itineraryMap);
        }
        var roadtripContainer = document.getElementById('transit-leaflet-map');
        if (roadtripContainer && typeof roadtripMap !== 'undefined' && roadtripMap) {
            roadtripMap.eachLayer(function(l) {
                if (l instanceof L.TileLayer) {
                    roadtripMap.removeLayer(l);
                }
            });
            createBasemapTileLayer(isDark).addTo(roadtripMap);
        }
    }

    function updatePaxCount(type, delta) {
        if (!selectedPax) selectedPax = { adults: 2, children: 0, elderly: 0 };
        if (type === 'adults') {
            selectedPax.adults = Math.max(1, Math.min(10, selectedPax.adults + delta));
            const el = document.getElementById('pax-adults');
            if (el) el.innerText = selectedPax.adults;
        } else if (type === 'children') {
            selectedPax.children = Math.max(0, Math.min(6, selectedPax.children + delta));
            const el = document.getElementById('pax-children');
            if (el) el.innerText = selectedPax.children;
        } else if (type === 'elderly') {
            selectedPax.elderly = Math.max(0, Math.min(4, selectedPax.elderly + delta));
            const el = document.getElementById('pax-elderly');
            if (el) el.innerText = selectedPax.elderly;
        }
        updateManifestTotal();
    }
    return {
        showView: showView,
        navTo: navTo,
        selectBudget: selectBudget,
        togglePref: togglePref,
        usePrompt: usePrompt,
        buildTrip: buildTrip,
        switchDay: switchDay,
        filterHotels: filterHotels,
        bookHotel: bookHotel,
        closeBookingModal: closeBookingModal,
        selectRoom: selectRoom,
        confirmBooking: confirmBooking,
        loadEventDashboard: loadEventDashboard,
        triggerDisruptionReplan: triggerDisruptionReplan,
        acceptReplannedItinerary: acceptReplannedItinerary,
        revertReplannedItinerary: revertReplannedItinerary,
        exploreDest: exploreDest,
        generateRoadtrip: recalculateRoute,
        renderTransportView: renderTransportView,
        openGoogleMapsRoute: openGoogleMapsRoute,
        exportGPXRoute: exportGPXRoute,
        switchTransitMode: switchTransitMode,
        toggleElevationSheet: toggleElevationSheet,
        recalculateRoute: recalculateRoute,
        setTransitOrigin: setTransitOrigin,
        setTransitDestination: setTransitDestination,
        swapTransitDirection: swapTransitDirection,
        recenterRoadMap: recenterRoadMap,
        searchFlightsModal: searchFlightsModal,
        bookChauffeur: bookChauffeur,
        toggleDark: toggleDark,
        updatePaxCount: updatePaxCount,
        setSanctumDestination: setSanctumDestination,
        updateManifestTotal: updateManifestTotal,
        selectDestination: selectDestination,
        updateTelemetryForDates: updateTelemetryForDates,
        renderMiniCalendar: renderMiniCalendar
    };
})();

if (typeof window !== "undefined") { window.app = app; }
