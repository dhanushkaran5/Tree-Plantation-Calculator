// City Pollution Comparator Logic

// Load cities data from shared file
const CITY_COORDINATES = {};
// Populate from INDIAN_CITIES if available
if (typeof INDIAN_CITIES !== 'undefined') {
    Object.keys(INDIAN_CITIES).forEach(city => {
        CITY_COORDINATES[city] = {
            lat: INDIAN_CITIES[city].lat,
            lng: INDIAN_CITIES[city].lng,
            country: 'IN'
        };
    });
} else {
    // Fallback to basic cities
    CITY_COORDINATES['Delhi'] = { lat: 28.6139, lng: 77.2090, country: 'IN' };
    CITY_COORDINATES['Chennai'] = { lat: 13.0827, lng: 80.2707, country: 'IN' };
    CITY_COORDINATES['Bangalore'] = { lat: 12.9716, lng: 77.5946, country: 'IN' };
    CITY_COORDINATES['Mumbai'] = { lat: 19.0760, lng: 72.8777, country: 'IN' };
    CITY_COORDINATES['Hyderabad'] = { lat: 17.3850, lng: 78.4867, country: 'IN' };
    CITY_COORDINATES['Kolkata'] = { lat: 22.5726, lng: 88.3639, country: 'IN' };
    CITY_COORDINATES['Pune'] = { lat: 18.5204, lng: 73.8567, country: 'IN' };
    CITY_COORDINATES['Jaipur'] = { lat: 26.9124, lng: 75.7873, country: 'IN' };
    CITY_COORDINATES['Ahmedabad'] = { lat: 23.0225, lng: 72.5714, country: 'IN' };
}

let comparisonChart = null;
let cityDataCache = {};

// Load city pollution data
async function loadCityData() {
    const citySelect = document.getElementById('citySelect');
    const city = citySelect.value;

    if (!city) {
        document.getElementById('pollutionData').style.display = 'none';
        return;
    }

    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const pollutionData = document.getElementById('pollutionData');

    loading.style.display = 'block';
    errorMessage.style.display = 'none';
    pollutionData.style.display = 'none';

    try {
        // Check cache first
        if (cityDataCache[city] && (Date.now() - cityDataCache[city].timestamp) < 300000) {
            // Use cached data if less than 5 minutes old
            displayPollutionData(city, cityDataCache[city].data);
            loading.style.display = 'none';
            return;
        }

        // Fetch from Open-Meteo Air Quality API
        const coords = CITY_COORDINATES[city];
        // Open-Meteo Air Quality API
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=pm10,pm2_5,us_aqi&timezone=auto`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.current) {
            throw new Error('No data returned from API');
        }

        const pollutionData = {
            pm25: data.current.pm2_5,
            pm10: data.current.pm10,
            aqi: calculateIndianAQI(data.current.pm2_5, data.current.pm10) // Use calculated Indian AQI
        };

        // Cache the data
        cityDataCache[city] = { data: pollutionData, timestamp: Date.now() };
        displayPollutionData(city, pollutionData);

        loading.style.display = 'none';
    } catch (error) {
        console.error('Error fetching pollution data:', error);

        // Fallback to mock data
        const mockData = getMockPollutionData(city);
        cityDataCache[city] = { data: mockData, timestamp: Date.now() };
        displayPollutionData(city, mockData);
        loading.style.display = 'none';

        errorMessage.style.display = 'block';
        errorMessage.textContent = `Using estimated data. API error: ${error.message}`;
    }
}

// Get mock pollution data (fallback)
function getMockPollutionData(city) {
    // Mock data based on typical pollution levels in Indian cities
    const mockData = {
        'Delhi': { pm25: 150, pm10: 250, aqi: 300 },
        'Chennai': { pm25: 80, pm10: 120, aqi: 150 },
        'Bangalore': { pm25: 70, pm10: 110, aqi: 140 },
        'Mumbai': { pm25: 100, pm10: 150, aqi: 200 },
        'Hyderabad': { pm25: 85, pm10: 130, aqi: 160 },
        'Kolkata': { pm25: 110, pm10: 170, aqi: 210 },
        'Pune': { pm25: 75, pm10: 115, aqi: 145 },
        'Jaipur': { pm25: 95, pm10: 140, aqi: 185 },
        'Ahmedabad': { pm25: 105, pm10: 160, aqi: 205 }
    };

    return mockData[city] || { pm25: 100, pm10: 150, aqi: 200 };
}

// Calculate Indian AQI (CPCB Standard)
function calculateIndianAQI(pm25, pm10) {
    // Helper to calculate sub-index
    function getSubIndex(conc, breakpoints) {
        for (const bp of breakpoints) {
            if (conc >= bp.lo && conc <= bp.hi) {
                return Math.round(
                    ((bp.aqi_hi - bp.aqi_lo) / (bp.hi - bp.lo)) * (conc - bp.lo) + bp.aqi_lo
                );
            }
        }
        // If above max range, extrapolate or cap
        const last = breakpoints[breakpoints.length - 1];
        if (conc > last.hi) {
            return Math.round(
                ((last.aqi_hi - last.aqi_lo) / (last.hi - last.lo)) * (conc - last.lo) + last.aqi_lo
            );
        }
        return 0;
    }

    // PM2.5 Breakpoints (CPCB)
    const pm25Breakpoints = [
        { lo: 0, hi: 30, aqi_lo: 0, aqi_hi: 50 },
        { lo: 31, hi: 60, aqi_lo: 51, aqi_hi: 100 },
        { lo: 61, hi: 90, aqi_lo: 101, aqi_hi: 200 },
        { lo: 91, hi: 120, aqi_lo: 201, aqi_hi: 300 },
        { lo: 121, hi: 250, aqi_lo: 301, aqi_hi: 400 },
        { lo: 251, hi: 5000, aqi_lo: 401, aqi_hi: 500 } // Extended upper bound
    ];

    // PM10 Breakpoints (CPCB)
    const pm10Breakpoints = [
        { lo: 0, hi: 50, aqi_lo: 0, aqi_hi: 50 },
        { lo: 51, hi: 100, aqi_lo: 51, aqi_hi: 100 },
        { lo: 101, hi: 250, aqi_lo: 101, aqi_hi: 200 },
        { lo: 251, hi: 350, aqi_lo: 201, aqi_hi: 300 },
        { lo: 351, hi: 430, aqi_lo: 301, aqi_hi: 400 },
        { lo: 431, hi: 5000, aqi_lo: 401, aqi_hi: 500 } // Extended upper bound
    ];

    const aqi25 = getSubIndex(pm25, pm25Breakpoints);
    const aqi10 = getSubIndex(pm10, pm10Breakpoints);

    // Indian AQI is the max of sub-indices
    return Math.max(aqi25, aqi10);
}

// Export for use in other files if needed
window.calculateIndianAQI = calculateIndianAQI;

// Display pollution data
function displayPollutionData(city, data) {
    document.getElementById('aqiValue').textContent = data.aqi || 'N/A';
    document.getElementById('pm25Value').textContent = data.pm25 ? Math.round(data.pm25) : 'N/A';
    document.getElementById('pm10Value').textContent = data.pm10 ? Math.round(data.pm10) : 'N/A';

    // Calculate tree recommendations
    calculateTreeRecommendations(city, data);

    // Calculate daily offset
    calculateDailyOffset(city);

    // Show before/after simulation
    showBeforeAfterSimulation(city, data);

    document.getElementById('pollutionData').style.display = 'block';
    renderCityAqiList();
}

// Calculate daily offset
function calculateDailyOffset(city) {
    const calculations = Calculations.getAll();
    const userTrees = calculations.map(calc => ({
        species: calc.species,
        count: calc.count || 0
    })).filter(tree => tree.count > 0);

    const dailyOffset = RealTimeAQI.calculateDailyOffset(city, userTrees);
    const dailyOffsetDiv = document.getElementById('dailyOffset');

    let html = `
        <div class="metric-card" style="background: ${dailyOffset.healthImpact.color}; color: white; margin-bottom: 1rem;">
            <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">Today's AQI: ${dailyOffset.todayAQI}</div>
            <div style="font-size: 2rem; font-weight: bold; margin: 0.5rem 0;">${dailyOffset.healthImpact.level}</div>
            <div>Health Risk: ${dailyOffset.healthImpact.risk}</div>
        </div>

        <div class="summary-grid" style="margin-top: 1rem;">
            <div class="summary-card">
                <h3>${Utils.formatNumber(Math.round(dailyOffset.dailyCO2Offset))}</h3>
                <p>Daily CO₂ Offset (kg)</p>
            </div>
            <div class="summary-card">
                <h3>${Utils.formatNumber(Math.round(dailyOffset.dailyO2Production))}</h3>
                <p>Daily O₂ Production (kg)</p>
            </div>
            <div class="summary-card">
                <h3>${dailyOffset.projectedAQI}</h3>
                <p>Projected AQI (with trees)</p>
            </div>
        </div>

        <div class="alert alert-info" style="margin-top: 1rem;">
            <strong>💡 ${dailyOffset.message}</strong>
            ${dailyOffset.treesNeededForHealthy > 0 ? `<br><small>Need ${Utils.formatNumber(dailyOffset.treesNeededForHealthy)} more trees to reach healthy AQI (50)</small>` : ''}
        </div>
    `;

    dailyOffsetDiv.innerHTML = html;
}

// Show before/after simulation
function showBeforeAfterSimulation(city, pollutionData) {
    const calculations = Calculations.getAll();
    const totalTrees = calculations.reduce((sum, calc) => sum + (calc.count || 0), 0);
    const avgSpecies = calculations.length > 0 ? calculations[0].species : 'Neem';

    const scenario = {
        city: city,
        currentAQI: pollutionData.aqi || 200,
        treesToPlant: totalTrees || 100,
        species: avgSpecies
    };

    const simulation = PollutionSimulation.simulate(scenario);

    // Add before/after section if not exists
    let beforeAfterDiv = document.getElementById('beforeAfterSimulation');
    if (!beforeAfterDiv) {
        const comparisonDiv = document.querySelector('.card:last-of-type');
        beforeAfterDiv = document.createElement('div');
        beforeAfterDiv.id = 'beforeAfterSimulation';
        beforeAfterDiv.className = 'card';
        beforeAfterDiv.style.marginTop = '2rem';
        comparisonDiv.parentNode.insertBefore(beforeAfterDiv, comparisonDiv.nextSibling);
    }

    let html = `
        <h2 class="card-title">Before/After Pollution Impact Simulation</h2>
        <p>See how different tree planting scenarios affect air quality</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
            <!-- Before -->
            <div class="card" style="border-left: 5px solid #dc3545;">
                <h3 style="color: #dc3545; margin-bottom: 1rem;">Current (Before)</h3>
                <div class="metric-card" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
                    <div style="font-size: 2rem; font-weight: bold;">AQI: ${simulation.before.aqi}</div>
                    <div style="margin-top: 0.5rem;">${simulation.before.healthImpact.level}</div>
                </div>
                <div style="margin-top: 1rem;">
                    <p><strong>PM2.5:</strong> ${Math.round(simulation.before.pm25)} μg/m³</p>
                    <p><strong>PM10:</strong> ${Math.round(simulation.before.pm10)} μg/m³</p>
                    <p><strong>Health Risk:</strong> ${simulation.before.healthImpact.risk}</p>
                </div>
            </div>

            <!-- After 100 Trees -->
            <div class="card" style="border-left: 5px solid #ff9800;">
                <h3 style="color: #ff9800; margin-bottom: 1rem;">100 Trees</h3>
                <div class="metric-card" style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);">
                    <div style="font-size: 2rem; font-weight: bold;">AQI: ${simulation.after100.aqi}</div>
                    <div style="margin-top: 0.5rem;">${simulation.after100.healthImpact.level}</div>
                </div>
                <div style="margin-top: 1rem;">
                    <p><strong>Improvement:</strong> ${Math.round(simulation.after100.improvement)}%</p>
                    <p><strong>CO₂ Offset:</strong> ${Utils.formatNumber(Math.round(simulation.after100.co2Offset))} kg/year</p>
                    <p><strong>Health Risk:</strong> ${simulation.after100.healthImpact.risk}</p>
                </div>
            </div>

            <!-- After 500 Trees -->
            <div class="card" style="border-left: 5px solid #4CAF50;">
                <h3 style="color: #4CAF50; margin-bottom: 1rem;">500 Trees</h3>
                <div class="metric-card" style="background: linear-gradient(135deg, #4CAF50 0%, #388e3c 100%);">
                    <div style="font-size: 2rem; font-weight: bold;">AQI: ${simulation.after500.aqi}</div>
                    <div style="margin-top: 0.5rem;">${simulation.after500.healthImpact.level}</div>
                </div>
                <div style="margin-top: 1rem;">
                    <p><strong>Improvement:</strong> ${Math.round(simulation.after500.improvement)}%</p>
                    <p><strong>CO₂ Offset:</strong> ${Utils.formatNumber(Math.round(simulation.after500.co2Offset))} kg/year</p>
                    <p><strong>Health Risk:</strong> ${simulation.after500.healthImpact.risk}</p>
                </div>
            </div>

            <!-- After 1000 Trees -->
            <div class="card" style="border-left: 5px solid #2196F3;">
                <h3 style="color: #2196F3; margin-bottom: 1rem;">1000 Trees</h3>
                <div class="metric-card" style="background: linear-gradient(135deg, #2196F3 0%, #1976d2 100%);">
                    <div style="font-size: 2rem; font-weight: bold;">AQI: ${simulation.after1000.aqi}</div>
                    <div style="margin-top: 0.5rem;">${simulation.after1000.healthImpact.level}</div>
                </div>
                <div style="margin-top: 1rem;">
                    <p><strong>Improvement:</strong> ${Math.round(simulation.after1000.improvement)}%</p>
                    <p><strong>CO₂ Offset:</strong> ${Utils.formatNumber(Math.round(simulation.after1000.co2Offset))} kg/year</p>
                    <p><strong>Health Risk:</strong> ${simulation.after1000.healthImpact.risk}</p>
                </div>
            </div>

            <!-- Optimal -->
            <div class="card" style="border-left: 5px solid #9C27B0;">
                <h3 style="color: #9C27B0; margin-bottom: 1rem;">Optimal (Target)</h3>
                <div class="metric-card" style="background: linear-gradient(135deg, #9C27B0 0%, #7b1fa2 100%);">
                    <div style="font-size: 2rem; font-weight: bold;">AQI: ${simulation.optimal.aqi}</div>
                    <div style="margin-top: 0.5rem;">${simulation.optimal.healthImpact.level}</div>
                </div>
                <div style="margin-top: 1rem;">
                    <p><strong>Trees Needed:</strong> ${Utils.formatNumber(simulation.optimal.trees)}</p>
                    <p><strong>Improvement:</strong> ${Math.round(simulation.optimal.improvement)}%</p>
                    <p><strong>CO₂ Offset:</strong> ${Utils.formatNumber(Math.round(simulation.optimal.co2Offset))} kg/year</p>
                    <p><strong>Health Risk:</strong> ${simulation.optimal.healthImpact.risk}</p>
                </div>
            </div>
        </div>
    `;

    beforeAfterDiv.innerHTML = html;
}

// Calculate tree recommendations
function calculateTreeRecommendations(city, pollutionData) {
    const recommendationsDiv = document.getElementById('treeRecommendations');

    // Estimate annual CO2 emissions per person in the city
    // Average Indian city: ~2 tonnes CO2 per person per year
    // For high pollution cities, estimate higher
    const avgCO2PerPerson = pollutionData.aqi > 200 ? 2.5 : 2.0; // tonnes
    const cityPopulation = {
        'Delhi': 19000000,
        'Chennai': 11000000,
        'Bangalore': 13000000,
        'Mumbai': 20000000,
        'Hyderabad': 10000000,
        'Kolkata': 14800000,
        'Pune': 8000000,
        'Jaipur': 4000000,
        'Ahmedabad': 8400000
    }[city] || 10000000;

    const totalAnnualCO2 = avgCO2PerPerson * cityPopulation; // tonnes
    const totalAnnualCO2kg = totalAnnualCO2 * 1000; // kg

    // Calculate trees needed for each species
    const recommendations = Object.keys(TREE_SPECIES).map(species => {
        const tree = getTreeData(species);
        const co2PerYear = tree ? (tree.co2PerYear || tree) : 20;
        const treesNeeded = Math.ceil(totalAnnualCO2kg / co2PerYear);
        return { species, treesNeeded, co2PerYear };
    }).sort((a, b) => a.treesNeeded - b.treesNeeded);

    let html = `
        <div class="alert alert-info">
            <strong>Estimated Annual CO₂ Emissions for ${city}:</strong> ${Utils.formatNumber(Math.round(totalAnnualCO2))} tonnes
            <br><small>Based on population and pollution levels</small>
        </div>
        <h3 style="margin-top: 1.5rem;">Recommended Trees to Offset Annual Emissions:</h3>
        <div style="display: grid; gap: 1rem; margin-top: 1rem;">
    `;

    recommendations.forEach(rec => {
        html += `
            <div class="result-item">
                <div>
                    <strong>${rec.species}</strong><br>
                    <small>CO₂ absorption: ${rec.co2PerYear} kg/tree/year</small>
                </div>
                <div style="text-align: right;">
                    <strong style="font-size: 1.2rem; color: var(--green-primary);">
                        ${Utils.formatNumber(rec.treesNeeded)} trees
                    </strong>
                </div>
            </div>
        `;
    });

    html += '</div>';
    recommendationsDiv.innerHTML = html;
}

// Compare all cities
async function compareAllCities() {
    const cities = Object.keys(CITY_COORDINATES);
    const comparisonData = {
        labels: [],
        pm25: [],
        pm10: [],
        aqi: []
    };

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';

    // Helper for concurrency control
    async function fetchWithConcurrency(items, fn, limit) {
        const results = [];
        const executing = [];
        for (const item of items) {
            const p = Promise.resolve().then(() => fn(item));
            results.push(p);
            if (limit <= items.length) {
                const e = p.then(() => executing.splice(executing.indexOf(e), 1));
                executing.push(e);
                if (executing.length >= limit) {
                    await Promise.race(executing);
                }
            }
        }
        return Promise.all(results);
    }

    // Fetch function for a single city
    async function fetchCity(city) {
        if (!cityDataCache[city] || (Date.now() - cityDataCache[city].timestamp) > 300000) {
            const coords = CITY_COORDINATES[city];
            try {
                const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=pm10,pm2_5,us_aqi&timezone=auto`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.current) {
                    const pollutionData = {
                        pm25: data.current.pm2_5,
                        pm10: data.current.pm10,
                        aqi: calculateIndianAQI(data.current.pm2_5, data.current.pm10) // Use calculated Indian AQI
                    };
                    cityDataCache[city] = { data: pollutionData, timestamp: Date.now() };
                } else {
                    cityDataCache[city] = { data: getMockPollutionData(city), timestamp: Date.now() };
                }
            } catch (error) {
                console.warn(`Failed to fetch for ${city}`, error);
                cityDataCache[city] = { data: getMockPollutionData(city), timestamp: Date.now() };
            }
        }
        // Update list UI incrementally if needed, or just wait for all
        // renderCityAqiList(); // Optional: update list as data comes in
    }

    // Fetch all with limit of 5 concurrent requests
    await fetchWithConcurrency(cities, fetchCity, 5);

    // Prepare data for chart
    for (const city of cities) {
        const data = cityDataCache[city].data;
        comparisonData.labels.push(city);
        comparisonData.pm25.push(data.pm25 || 0);
        comparisonData.pm10.push(data.pm10 || 0);
        comparisonData.aqi.push(data.aqi || 0);
    }

    if (loading) loading.style.display = 'none';

    // Draw comparison chart
    drawComparisonChart(comparisonData);
    // Update list with fresh data
    renderCityAqiList();
}

// Draw comparison chart
function drawComparisonChart(data) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');

    if (comparisonChart) {
        comparisonChart.destroy();
    }

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'PM2.5 (μg/m³)',
                    data: data.pm25,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 2
                },
                {
                    label: 'PM10 (μg/m³)',
                    data: data.pm10,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 2
                },
                {
                    label: 'AQI',
                    data: data.aqi,
                    backgroundColor: 'rgba(255, 206, 86, 0.6)',
                    borderColor: 'rgb(255, 206, 86)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'City Pollution Comparison'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'PM2.5 & PM10 (μg/m³)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'AQI'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function getAqiBadge(aqi) {
    if (aqi >= 300) return { label: 'Hazardous', color: '#b5179e' };
    if (aqi >= 200) return { label: 'Very Poor', color: '#e76f51' };
    if (aqi >= 150) return { label: 'Poor', color: '#f4a261' };
    if (aqi >= 100) return { label: 'Moderate', color: '#82c09a' };
    return { label: 'Good', color: '#2c6e49' };
}

function renderCityAqiList() {
    const container = document.getElementById('cityAqiList');
    if (!container || typeof INDIAN_CITIES === 'undefined') return;

    const rows = Object.keys(INDIAN_CITIES).map(city => {
        const base = INDIAN_CITIES[city];
        const live = cityDataCache[city]?.data || {};
        return {
            city,
            aqi: live.aqi || base.aqi,
            pm25: live.pm25 || base.pm25,
            pm10: live.pm10 || base.pm10
        };
    }).sort((a, b) => (b.aqi || 0) - (a.aqi || 0));

    const html = `
        <div class="city-aqi-table">
            <div class="city-aqi-row city-aqi-head">
                <span>City</span>
                <span>Current AQI</span>
                <span>PM2.5</span>
                <span>PM10</span>
            </div>
            ${rows.map(row => {
        const badge = getAqiBadge(row.aqi || 0);
        return `
                    <div class="city-aqi-row">
                        <span>${row.city}</span>
                        <span>
                            <span class="aqi-pill" style="background:${badge.color}1a; color:${badge.color};">
                                ${row.aqi ?? 'N/A'} • ${badge.label}
                            </span>
                        </span>
                        <span>${row.pm25 ? Math.round(row.pm25) : '—'} μg/m³</span>
                        <span>${row.pm10 ? Math.round(row.pm10) : '—'} μg/m³</span>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    renderCityAqiList();
    // Auto-fetch live data for all cities on load
    compareAllCities();
});

window.loadCityData = loadCityData;
window.compareAllCities = compareAllCities;
