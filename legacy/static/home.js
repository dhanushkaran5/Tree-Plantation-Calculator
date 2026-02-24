// Home page insights, AQI + climate intelligence, and calculator helpers

const AQI_BANDS = [
    { category: 'Good', min: 0, max: 50, color: '#2c6e49', message: 'Air is clean. Focus on biodiversity and shade.' },
    { category: 'Moderate', min: 51, max: 100, color: '#82c09a', message: 'Decent air, but planting hardy native trees helps.' },
    { category: 'Poor', min: 101, max: 200, color: '#f4a261', message: 'Pollution rising—choose high absorption species.' },
    { category: 'Very Poor', min: 201, max: 300, color: '#e76f51', message: 'Urgent action needed. Plant dense buffers.' },
    { category: 'Hazardous', min: 301, max: 500, color: '#b5179e', message: 'Severe AQI. Combine rapid growers + pollution tolerant species.' }
];

// Removed MOCK_CITY_DATA

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const HomeInsights = {
    charts: {
        aqiBenefit: null,
        planting: null,
        carbonTimeline: null
    },
    state: {
        city: null,
        aqiData: null
    },

    init() {
        this.populateSpeciesDropdowns();
        this.populateCityDatalist();
        this.initQuotes();
        this.renderEmptyCharts();
        this.prefillCityFromStorage();
        this.setHeroStats();
    },

    populateCityDatalist() {
        const datalist = document.getElementById('cityList');
        if (!datalist || typeof INDIAN_CITIES === 'undefined') return;

        const cities = Object.keys(INDIAN_CITIES).sort();
        datalist.innerHTML = cities.map(city => `<option value="${city}">`).join('');
    },

    setHeroStats() {
        const speciesCount = Object.keys(TREE_SPECIES || {}).length;
        const cityCount = typeof INDIAN_CITIES !== 'undefined'
            ? Object.keys(INDIAN_CITIES).length
            : 50;
        const cityEl = document.getElementById('heroCityCount');
        const speciesEl = document.getElementById('heroSpeciesCount');
        if (cityEl) {
            cityEl.textContent = `${cityCount}+`;
        }
        if (speciesEl) {
            speciesEl.textContent = `${speciesCount}+`;
        }
    },

    populateSpeciesDropdowns() {
        const speciesOptions = Object.keys(TREE_SPECIES)
            .map(species => `<option value="${species}">${species}</option>`)
            .join('');
        ['speciesSelect', 'plannedSpecies'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = `<option value="">Select species</option>${speciesOptions}`;
            }
        });
    },

    initQuotes() {
        const quotes = [
            '“The best time to plant a tree was 20 years ago. The second best time is now.”',
            '“Plant a tree today, breathe a better tomorrow.”',
            '“Trees are poems the earth writes upon the sky.”',
            '“One tree makes a million dreams breathable.”'
        ];
        let index = 0;
        setInterval(() => {
            index = (index + 1) % quotes.length;
            const heroQuote = document.getElementById('heroQuote');
            if (heroQuote) {
                heroQuote.textContent = quotes[index];
            }
        }, 8000);
    },

    renderEmptyCharts() {
        const ctxAqi = document.getElementById('aqiBenefitChart');
        const ctxPlanting = document.getElementById('plantingChart');
        const ctxCarbon = document.getElementById('carbonTimelineChart');

        if (ctxAqi) {
            this.charts.aqiBenefit = new Chart(ctxAqi, {
                type: 'bar',
                data: {
                    labels: ['Good', 'Moderate', 'Poor'],
                    datasets: [{
                        label: 'Trees Needed',
                        data: [10, 20, 40],
                        backgroundColor: ['#2c6e49', '#82c09a', '#f4a261']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }

        if (ctxPlanting) {
            this.charts.planting = new Chart(ctxPlanting, {
                type: 'bar',
                data: {
                    labels: MONTH_LABELS,
                    datasets: [{
                        label: 'Planting score',
                        data: new Array(12).fill(30),
                        backgroundColor: '#a3d3b1'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, min: 0 } } }
            });
        }

        if (ctxCarbon) {
            this.charts.carbonTimeline = new Chart(ctxCarbon, {
                type: 'line',
                data: {
                    labels: ['5 yrs', '10 yrs', '20 yrs'],
                    datasets: [{
                        label: 'CO₂ absorbed (kg)',
                        data: [0, 0, 0],
                        borderColor: '#2c6e49',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(44,110,73,0.15)'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    },

    prefillCityFromStorage() {
        const cityInput = document.getElementById('cityInput');
        if (!cityInput) return;
        const lastCity = localStorage.getItem('ecotree_last_city');
        if (lastCity) {
            cityInput.value = lastCity;
            this.handleCityLookup();
        }
    },

    async handleCityLookup() {
        const cityInput = document.getElementById('cityInput');
        const city = cityInput.value.trim();

        if (!city) {
            Utils.showAlert('Please enter a city name.', 'error');
            return;
        }

        // Show loading state (optional improvement)
        const btn = document.querySelector('.city-input button');
        const originalText = btn.textContent;
        btn.textContent = 'Analyzing...';
        btn.disabled = true;

        try {
            localStorage.setItem('ecotree_last_city', city);
            const data = await this.fetchCityData(city);

            if (!data) {
                throw new Error('City data not found');
            }

            this.state.city = city;
            this.state.aqiData = data;
            this.updateAqiCard(data);
            this.updateClimateCard(data);
            this.updatePlantingChart(data);
        } catch (error) {
            console.error('Analysis failed:', error);
            Utils.showAlert(`Could not fetch data for ${city}. Please try a major Indian city.`, 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    },

    async fetchCityData(city) {
        // 1. Get Coordinates
        let coords = getCityCoordinates(city);

        // If not in our local DB, try to find it (or default to a fallback if we had a geocoding API)
        // For now, if not in INDIAN_CITIES, we might fail or use a fallback. 
        // Let's try to be robust: if strict match fails, try case-insensitive
        if (!coords && typeof INDIAN_CITIES !== 'undefined') {
            const key = Object.keys(INDIAN_CITIES).find(k => k.toLowerCase() === city.toLowerCase());
            if (key) coords = INDIAN_CITIES[key];
        }

        if (!coords) {
            // Fallback: Use Open-Meteo Geocoding API if local lookup fails
            try {
                const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
                const geoRes = await fetch(geoUrl);
                const geoData = await geoRes.json();
                if (geoData.results && geoData.results.length > 0) {
                    coords = { lat: geoData.results[0].latitude, lng: geoData.results[0].longitude };
                }
            } catch (e) {
                console.warn('Geocoding failed', e);
            }
        }

        if (!coords) return null;

        // 2. Fetch Weather & AQI from Open-Meteo
        // Weather: temp, humidity, rain
        // AQI: european_aqi (we can map this) or pm2_5

        const params = new URLSearchParams({
            latitude: coords.lat,
            longitude: coords.lng,
            current: 'temperature_2m,relative_humidity_2m,rain,pm2_5',
            timezone: 'auto'
        });

        // We need to hit two endpoints or one if they merged them? 
        // Open-Meteo has separate Air Quality API.

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,rain&timezone=auto`;
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=pm2_5,us_aqi&timezone=auto`;

        const [weatherRes, aqiRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(aqiUrl)
        ]);

        const weatherData = await weatherRes.json();
        const aqiData = await aqiRes.json();

        return {
            aqi: this.calculateIndianAQI(aqiData.current.pm2_5, 0), // PM10 not fetched here, estimate or ignore
            pm25: aqiData.current.pm2_5,
            temp: weatherData.current.temperature_2m,
            humidity: weatherData.current.relative_humidity_2m,
            rainfall: weatherData.current.rain,
            climate: this.determineClimate(weatherData.current.temperature_2m, weatherData.current.rain)
        };
    },

    calculateIndianAQI(pm25, pm10) {
        // Simplified version for Home Page (PM2.5 driven)
        // PM2.5 Breakpoints (CPCB)
        if (pm25 <= 30) return Math.round((pm25 / 30) * 50);
        if (pm25 <= 60) return Math.round(51 + ((pm25 - 31) / 29) * 49);
        if (pm25 <= 90) return Math.round(101 + ((pm25 - 61) / 29) * 99);
        if (pm25 <= 120) return Math.round(201 + ((pm25 - 91) / 29) * 99);
        if (pm25 <= 250) return Math.round(301 + ((pm25 - 121) / 129) * 99);
        return Math.round(401 + ((pm25 - 251) / 249) * 99);
    },

    determineClimate(temp, rain) {
        if (rain > 5) return 'Tropical Monsoon';
        if (temp > 30) return 'Arid / Hot';
        if (temp < 15) return 'Temperate';
        return 'Tropical Savanna';
    },

    updateAqiCard(data) {
        const band = AQI_BANDS.find(b => data.aqi >= b.min && data.aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1];
        document.getElementById('aqiValue').textContent = data.aqi;
        const categoryEl = document.getElementById('aqiCategory');
        categoryEl.textContent = band.category;
        categoryEl.style.backgroundColor = `${band.color}1a`;
        categoryEl.style.color = band.color;
        document.getElementById('aqiMessage').textContent = band.message;

        const recommendedSpecies = this.getSpeciesByAQI(band.category);
        document.getElementById('aqiTreeList').innerHTML = recommendedSpecies.map(species => `<li>${species}</li>`).join('');

        const treesNeeded = [10, 18, 35, 60, 90];
        const benefitData = treesNeeded.map((value, idx) => ({
            label: AQI_BANDS[idx].category,
            value
        }));

        if (this.charts.aqiBenefit) {
            this.charts.aqiBenefit.data.labels = benefitData.map(item => item.label);
            this.charts.aqiBenefit.data.datasets[0].data = benefitData.map(item => item.value);
            this.charts.aqiBenefit.update();
        }
    },

    getSpeciesByAQI(category) {
        const mapping = {
            Good: ['Neem', 'Mango', 'Gulmohar'],
            Moderate: ['Peepal', 'Arjun', 'Bamboo'],
            Poor: ['Banyan', 'Mahogany', 'Jamun'],
            'Very Poor': ['Eucalyptus', 'Banyan Fig', 'Acacia'],
            Hazardous: ['Bamboo', 'Eucalyptus', 'Cedar']
        };
        return mapping[category] || ['Neem', 'Peepal', 'Bamboo'];
    },

    updateClimateCard(data) {
        document.getElementById('climateZone').textContent = data.climate || 'Unknown zone';
        const chips = [
            `Temp ${data.temp}°C`,
            `Humidity ${data.humidity}%`,
            `Rainfall ${data.rainfall} mm`
        ];
        document.getElementById('weatherChips').innerHTML = chips.map(text => `<span class="pill">${text}</span>`).join('');

        const narrative = this.generateClimateNarrative(data);
        document.getElementById('climateNarrative').textContent = narrative.text;
        document.getElementById('climateTreeList').innerHTML = narrative.species.map(item => `<li>${item}</li>`).join('');
    },

    generateClimateNarrative(data) {
        if (data.temp >= 32) {
            return {
                text: 'High heat—prioritize drought-tolerant, deep-rooted species.',
                species: ['Neem', 'Banyan', 'Acacia']
            };
        }
        if (data.humidity >= 70 && data.rainfall >= 10) {
            return {
                text: 'Humid and rainy—evergreen and fruit trees thrive.',
                species: ['Mango', 'Jackfruit', 'Jamun']
            };
        }
        if (data.humidity < 45) {
            return {
                text: 'Dry air—pair drip irrigation with hardy native species.',
                species: ['Arjun', 'Pine', 'Teak']
            };
        }
        return {
            text: 'Balanced weather—mix of canopy and fast growers recommended.',
            species: ['Peepal', 'Bamboo', 'Mahogany']
        };
    },

    updatePlantingChart(data) {
        const baseScore = data.rainfall > 8 ? 75 : 55;
        const scores = MONTH_LABELS.map((month, idx) => {
            const seasonalBoost = (idx >= 5 && idx <= 8) ? 25 : (idx === 3 || idx === 4 ? 15 : 5);
            const humidityFactor = data.humidity > 60 ? 10 : -5;
            return Math.min(100, Math.max(20, baseScore + seasonalBoost + humidityFactor));
        });
        if (this.charts.planting) {
            this.charts.planting.data.datasets[0].data = scores;
            this.charts.planting.update();
        }
        const topScore = Math.max(...scores);
        const bestMonths = scores
            .map((value, idx) => value === topScore ? MONTH_LABELS[idx] : null)
            .filter(Boolean);
        document.getElementById('plantingSummary').textContent = `Top planting window: ${bestMonths.slice(0, 3).join(', ')}. Scores adjust automatically with weather shifts.`;
    },

    calculateTreesNeeded() {
        const footprint = parseFloat(document.getElementById('footprintInput').value);
        const species = document.getElementById('speciesSelect').value || 'Neem';
        if (!footprint || footprint <= 0) {
            Utils.showAlert('Enter a valid CO₂ footprint value.', 'error');
            return;
        }
        const tree = getTreeData(species);
        const perTree = tree?.co2PerYear || 20;
        const treesRequired = Math.ceil(footprint / perTree);
        const fiveYear = perTree * treesRequired * 5;
        const result = `
            You need approximately <strong>${treesRequired}</strong> ${species} trees.<br>
            Together they absorb <strong>${Utils.formatNumber(fiveYear)}</strong> kg CO₂ in 5 years.
        `;
        document.getElementById('footprintResult').innerHTML = result;
    },

    calculateCO2Timeline() {
        const trees = parseInt(document.getElementById('plannedTrees').value, 10);
        const species = document.getElementById('plannedSpecies').value || 'Neem';
        if (!trees || trees <= 0) {
            Utils.showAlert('Enter a valid tree count.', 'error');
            return;
        }
        const tree = getTreeData(species);
        const perTree = tree?.co2PerYear || 20;
        const timeline = [5, 10, 20].map(years => perTree * trees * years);

        if (this.charts.carbonTimeline) {
            this.charts.carbonTimeline.data.datasets[0].data = timeline;
            this.charts.carbonTimeline.update();
        }

        document.getElementById('carbonTimelineSummary').innerHTML = `
            ${trees} ${species} trees absorb <strong>${Utils.formatNumber(timeline[0])}</strong> kg in 5 yrs,
            <strong>${Utils.formatNumber(timeline[1])}</strong> kg in 10 yrs, and
            <strong>${Utils.formatNumber(timeline[2])}</strong> kg in 20 yrs.
        `;
    }
};

window.HomeInsights = HomeInsights;

