// ================================================================
// Tree Plantation Calculator – Core Utilities (tpc-core.js)
// ================================================================
// TabManager | ForecastEngine | PDFPassport | SpeciesFilter
// PlantationCalendar | ScrollRevealPlus | CSVExporter | AQIGauge
// ================================================================

'use strict';

/* ----------------------------------------------------------------
   NAVIGATION HELPERS
   ---------------------------------------------------------------- */
const NavManager = (() => {
    function updateActiveLink() {
        const current = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-links a').forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === current) a.classList.add('active');
        });
    }

    function initMobileMenu() {
        const btn = document.getElementById('mobileMenuBtn');
        const links = document.getElementById('navLinks');
        if (!btn || !links) return;
        btn.addEventListener('click', () => {
            links.classList.toggle('nav-open');
            btn.setAttribute('aria-expanded', links.classList.contains('nav-open'));
        });
        document.addEventListener('click', e => {
            if (!btn.contains(e.target) && !links.contains(e.target)) {
                links.classList.remove('nav-open');
            }
        });
    }

    function init() {
        updateActiveLink();
        initMobileMenu();
        // Init dark mode from premium-modules if available
        if (typeof DarkModeToggle !== 'undefined') DarkModeToggle.init();
    }

    return { init };
})();

/* ----------------------------------------------------------------
   TAB MANAGER
   Manages smooth tab switching with transitions
   ---------------------------------------------------------------- */
const TabManager = (() => {
    function init(containerSelector) {
        const containers = document.querySelectorAll(containerSelector || '.tab-container');
        containers.forEach(container => {
            const tabs = container.querySelectorAll('.tab-btn');
            const panels = container.querySelectorAll('.tab-panel');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const target = tab.dataset.tab;
                    // Deactivate all
                    tabs.forEach(t => t.classList.remove('active'));
                    panels.forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
                    // Activate target
                    tab.classList.add('active');
                    const panel = container.querySelector(`.tab-panel[data-tab="${target}"]`);
                    if (panel) {
                        panel.style.display = 'block';
                        requestAnimationFrame(() => panel.classList.add('active'));
                    }
                });
            });

            // Activate first by default
            if (tabs.length > 0) tabs[0].click();
        });
    }

    return { init };
})();

/* ----------------------------------------------------------------
   FORECAST ENGINE
   50-year environmental projection calculations
   ---------------------------------------------------------------- */
const ForecastEngine = (() => {
    // Base rates per tree per year (weighted Indian species averages)
    const BASE = {
        co2PerTree: 22,           // kg CO₂/year
        oxygenPerTree: 1450,      // kg O₂/year
        waterRetentionPerTree: 4500, // litres/year
        canopyM2PerTree: 28,      // m² canopy at maturity
        tempReductionPer100: 0.8  // °C reduction per 100 trees
    };

    function project(numTrees, years, species) {
        const spec = (typeof TREE_SPECIES !== 'undefined' && TREE_SPECIES[species]) || {};
        const co2Rate = spec.co2PerYear || BASE.co2PerTree;
        const o2Rate  = spec.oxygenPerYear || BASE.oxygenPerTree;

        // Growth factor: trees reach full productivity after ~5 years
        function growthFactor(yr) {
            if (yr <= 2) return 0.2;
            if (yr <= 5) return 0.2 + (yr - 2) * 0.2;
            if (yr <= 15) return 0.8 + (yr - 5) * 0.02;
            return 1.0;
        }

        const result = { years: [], co2: [], oxygen: [], temp: [], canopy: [], aqi: [], cumCo2: [] };
        let cumCo2 = 0;

        for (let y = 1; y <= years; y++) {
            const gf = growthFactor(y);
            const yearlyCo2 = co2Rate * numTrees * gf;
            const yearlyO2  = o2Rate  * numTrees * gf;
            cumCo2 += yearlyCo2;

            result.years.push(y);
            result.co2.push(Math.round(yearlyCo2));
            result.oxygen.push(Math.round(yearlyO2 / 1000)); // tonnes
            result.temp.push(parseFloat((numTrees / 100 * BASE.tempReductionPer100 * Math.min(gf * 1.5, 1)).toFixed(2)));
            result.canopy.push(Math.round(numTrees * BASE.canopyM2PerTree * Math.min(gf, 1)));
            result.aqi.push(Math.round(Math.min(numTrees * 0.05 * gf, 50)));
            result.cumCo2.push(Math.round(cumCo2));
        }

        return result;
    }

    function summary(numTrees, years, species) {
        const data = project(numTrees, years, species);
        const last = years - 1;
        return {
            totalCO2: data.cumCo2[last],
            totalO2:  data.oxygen[last],
            tempReduction: data.temp[last],
            canopyCover: data.canopy[last],
            aqiImprovement: data.aqi[last],
            chartData: data
        };
    }

    return { project, summary };
})();

/* ----------------------------------------------------------------
   SPECIES FILTER
   Filterable card grid for tree species
   ---------------------------------------------------------------- */
const SpeciesFilter = (() => {
    const EMOJI_MAP = {
        Neem:'🌿', Banyan:'🌳', Peepal:'🍃', Bamboo:'🎍', Mango:'🥭', Eucalyptus:'🌲',
        Teak:'🪵', Acacia:'🌵', Gulmohar:'🌸', Mahogany:'🌴', Jamun:'🫐', Arjun:'🌱',
        Tamarind:'🍋', Coconut:'🥥', Jackfruit:'🍈', Moringa:'🌾', Neem:'🌿',
        Sandalwood:'🪶', Drumstick:'🥬', Amla:'🍎', Mahua:'🌼', Sal:'🌲', Deodar:'🏔️',
        Karanj:'🌾', Shisham:'🪵', Kadam:'🌺', Palash:'🌹', Casuarina:'🌊',
        Mulberry:'🍇', Guava:'🍐', Pomegranate:'🍷', default:'🌱'
    };

    function getEmoji(name) { return EMOJI_MAP[name] || EMOJI_MAP.default; }

    function getCO2Band(val) {
        if (val >= 40) return { label: 'Excellent', cls: 'band-excellent' };
        if (val >= 25) return { label: 'High', cls: 'band-high' };
        if (val >= 15) return { label: 'Medium', cls: 'band-medium' };
        return { label: 'Low', cls: 'band-low' };
    }

    function getGrowthSpeed(months) {
        // months from costPerSapling proxy — use climateZones length as heuristic
        return 'Medium';
    }

    function render(containerId, filterState) {
        const grid = document.getElementById(containerId);
        if (!grid || typeof TREE_SPECIES === 'undefined') return;

        const { climate, soil, speed, search } = filterState || {};
        const entries = Object.entries(TREE_SPECIES);

        const filtered = entries.filter(([name, data]) => {
            if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
            if (climate && climate !== 'all' && !data.climateZones.includes(climate)) return false;
            if (soil && soil !== 'all' && !data.soilTypes.includes(soil)) return false;
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="no-results-msg">No species match your filters. Try adjusting the criteria.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(([name, d]) => {
            const band = getCO2Band(d.co2PerYear);
            const emoji = getEmoji(name);
            const climates = d.climateZones.join(', ');
            const soils = d.soilTypes.slice(0, 2).join(', ');
            const lifespanStr = d.lifespan >= 1000 ? `${(d.lifespan/1000).toFixed(1)}K yrs` : `${d.lifespan} yrs`;
            const waterStr = d.waterPerWeek ? `${d.waterPerWeek}L/wk` : 'N/A';
            const riskColor = {
                'Very Low': '#00c853', 'Low': '#7ED957', 'Medium': '#ffd600', 'High': '#ff6d00', 'Very High': '#f44336'
            }[d.survivalRisk] || '#7ED957';

            return `
            <div class="species-card fade-up" data-name="${name}" data-climate="${d.climateZones.join(' ')}" data-soil="${d.soilTypes.join(' ')}">
                <div class="species-card-header">
                    <span class="species-emoji">${emoji}</span>
                    <div>
                        <div class="species-name">${name}</div>
                        <span class="species-badge ${band.cls}">${band.label} CO₂</span>
                    </div>
                    <div class="species-price-tag">₹${d.costPerSapling}</div>
                </div>
                <div class="species-metrics">
                    <div class="species-metric">
                        <span class="sm-icon">💨</span>
                        <span class="sm-val">${d.co2PerYear} <small>kg/yr</small></span>
                        <span class="sm-lbl">CO₂ Absorbed</span>
                    </div>
                    <div class="species-metric">
                        <span class="sm-icon">🫧</span>
                        <span class="sm-val">${(d.oxygenPerYear/1000).toFixed(1)} <small>T/yr</small></span>
                        <span class="sm-lbl">O₂ Generated</span>
                    </div>
                    <div class="species-metric">
                        <span class="sm-icon">⏳</span>
                        <span class="sm-val">${lifespanStr}</span>
                        <span class="sm-lbl">Lifespan</span>
                    </div>
                    <div class="species-metric">
                        <span class="sm-icon">💧</span>
                        <span class="sm-val">${waterStr}</span>
                        <span class="sm-lbl">Water Need</span>
                    </div>
                </div>
                <div class="species-details">
                    <div class="sd-row"><span>🌍 Climate:</span><strong>${climates}</strong></div>
                    <div class="sd-row"><span>🪨 Soil:</span><strong>${soils}</strong></div>
                    <div class="sd-row"><span>🛡️ Survival Risk:</span><strong style="color:${riskColor}">${d.survivalRisk}</strong></div>
                </div>
                <div class="species-best-months">
                    <span class="sbm-label">Best Planting:</span>
                    ${(d.bestPlantingMonths || []).map(m => `<span class="sbm-chip">${m.slice(0,3)}</span>`).join('')}
                </div>
            </div>`;
        }).join('');

        // Re-trigger scroll reveal for dynamically injected cards
        requestAnimationFrame(() => {
            if (typeof ScrollRevealPlus !== 'undefined') {
                ScrollRevealPlus.observeNew();
            }
            // Fallback: immediately reveal cards already in viewport
            setTimeout(() => {
                grid.querySelectorAll('.fade-up:not(.visible)').forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.top < window.innerHeight + 100) {
                        el.classList.add('visible');
                    }
                });
            }, 80);
        });
    }


    function initFilters(containerId, filterBarId) {
        const bar = document.getElementById(filterBarId);
        if (!bar) return;

        let state = { climate: 'all', soil: 'all', search: '' };

        bar.querySelectorAll('[data-filter-climate]').forEach(btn => {
            btn.addEventListener('click', () => {
                bar.querySelectorAll('[data-filter-climate]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.climate = btn.dataset.filterClimate;
                render(containerId, state);
            });
        });

        bar.querySelectorAll('[data-filter-soil]').forEach(btn => {
            btn.addEventListener('click', () => {
                bar.querySelectorAll('[data-filter-soil]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.soil = btn.dataset.filterSoil;
                render(containerId, state);
            });
        });

        const searchInput = bar.querySelector('[data-species-search]');
        if (searchInput) {
            searchInput.addEventListener('input', e => {
                state.search = e.target.value;
                render(containerId, state);
            });
        }

        // Initial render
        render(containerId, state);
    }

    return { render, initFilters, getEmoji, getCO2Band };
})();

/* ----------------------------------------------------------------
   PLANTATION CALENDAR
   Monthly recommendation engine
   ---------------------------------------------------------------- */
const PlantationCalendar = (() => {
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const MONTH_DATA = [
        { season: 'Winter', rainfall: 15, humidity: 70, suitability: 45, tip: 'Suitable for temperate species like Oak, Pine, Cedar', icon: '❄️', species: ['Oak','Pine','Cedar','Deodar'] },
        { season: 'Winter', rainfall: 10, humidity: 65, suitability: 40, tip: 'Best for bare-root transplants; low evapotranspiration', icon: '❄️', species: ['Pine','Cedar','Deodar','Sal'] },
        { season: 'Spring', rainfall: 18, humidity: 58, suitability: 55, tip: 'Warming soils; ideal for fruit trees and flowering species', icon: '🌸', species: ['Gulmohar','Amla','Jamun','Guava'] },
        { season: 'Spring', rainfall: 12, humidity: 45, suitability: 50, tip: 'Pre-monsoon planting prep; avoid heat-sensitive saplings', icon: '🌸', species: ['Acacia','Palash','Amaltas','Drumstick'] },
        { season: 'Pre-Monsoon', rainfall: 25, humidity: 42, suitability: 60, tip: 'Excellent for drought-hardy species; soil prep season', icon: '☀️', species: ['Neem','Bamboo','Moringa','Acacia'] },
        { season: 'Monsoon', rainfall: 185, humidity: 82, suitability: 98, tip: '⭐ Prime planting season — highest survival rates', icon: '🌧️', species: ['Neem','Banyan','Peepal','Mango','Bamboo','Moringa','Teak'] },
        { season: 'Monsoon', rainfall: 250, humidity: 88, suitability: 100, tip: '⭐ Peak monsoon — best month for maximum saplings', icon: '🌧️', species: ['Banyan','Peepal','Arjun','Kadam','Shisham','Teak','Bamboo'] },
        { season: 'Monsoon', rainfall: 220, humidity: 85, suitability: 95, tip: '⭐ Excellent moisture; ideal for all tropical species', icon: '🌧️', species: ['Neem','Mango','Jamun','Tamarind','Coconut','Casuarina'] },
        { season: 'Post-Monsoon', rainfall: 120, humidity: 75, suitability: 80, tip: 'Good moisture retention; suits water-loving species', icon: '🍂', species: ['Arjun','Banyan','Peepal','Jackfruit','Sal'] },
        { season: 'Post-Monsoon', rainfall: 50, humidity: 65, suitability: 70, tip: 'Cooling weather; good for temperate and subtropical', icon: '🍂', species: ['Oak','Cedar','Sal','Sandalwood','Mahua'] },
        { season: 'Winter', rainfall: 20, humidity: 60, suitability: 48, tip: 'Suitable for cold-hardy species; minimal irrigation needed', icon: '❄️', species: ['Pine','Cedar','Deodar','Oak','Reetha'] },
        { season: 'Winter', rainfall: 12, humidity: 65, suitability: 42, tip: 'Slowest growth period; focus on root establishment', icon: '❄️', species: ['Cedar','Deodar','Sandalwood','Mahua'] }
    ];

    function getSuitabilityClass(val) {
        if (val >= 90) return 'suit-excellent';
        if (val >= 70) return 'suit-good';
        if (val >= 50) return 'suit-moderate';
        return 'suit-low';
    }

    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const now = new Date();
        const currentMonth = now.getMonth();

        container.innerHTML = MONTHS.map((month, i) => {
            const data = MONTH_DATA[i];
            const sClass = getSuitabilityClass(data.suitability);
            const isNow = i === currentMonth;

            return `
            <div class="calendar-month-card ${sClass} ${isNow ? 'cal-current' : ''}">
                <div class="cal-month-header">
                    <span class="cal-icon">${data.icon}</span>
                    <div>
                        <div class="cal-month-name">${month}${isNow ? ' <span class="cal-now-badge">Now</span>' : ''}</div>
                        <div class="cal-season">${data.season}</div>
                    </div>
                    <div class="cal-suit-score ${sClass}">${data.suitability}%</div>
                </div>
                <div class="cal-bars">
                    <div class="cal-bar-row">
                        <span>🌧️ Rainfall</span>
                        <div class="cal-bar-track"><div class="cal-bar-fill" style="width:${Math.min(data.rainfall/3,100)}%; background:var(--green-primary)"></div></div>
                        <span>${data.rainfall}mm</span>
                    </div>
                    <div class="cal-bar-row">
                        <span>💧 Humidity</span>
                        <div class="cal-bar-track"><div class="cal-bar-fill" style="width:${data.humidity}%; background:var(--green-secondary)"></div></div>
                        <span>${data.humidity}%</span>
                    </div>
                </div>
                <div class="cal-tip">${data.tip}</div>
                <div class="cal-species-list">
                    ${data.species.slice(0,4).map(s => `<span class="cal-species-chip">${SpeciesFilter.getEmoji(s)} ${s}</span>`).join('')}
                </div>
            </div>`;
        }).join('');
    }

    return { render, MONTH_DATA, MONTHS };
})();

/* ----------------------------------------------------------------
   AQI GAUGE
   SVG circular gauge for AQI display
   ---------------------------------------------------------------- */
const AQIGauge = (() => {
    function getAQIInfo(aqi) {
        if (aqi <= 50)  return { label: 'Good',            color: '#00e400', textColor: '#005500', icon: '😊' };
        if (aqi <= 100) return { label: 'Satisfactory',    color: '#92d050', textColor: '#2c5f2e', icon: '🙂' };
        if (aqi <= 150) return { label: 'Moderate',        color: '#ffde33', textColor: '#7d5a00', icon: '😐' };
        if (aqi <= 200) return { label: 'Poor',            color: '#ff9933', textColor: '#a34000', icon: '😷' };
        if (aqi <= 300) return { label: 'Very Poor',       color: '#cc0033', textColor: '#cc0033', icon: '🤢' };
        return                 { label: 'Hazardous',       color: '#7e0023', textColor: '#7e0023', icon: '☠️' };
    }

    function render(svgId, aqi) {
        const el = document.getElementById(svgId);
        if (!el) return;
        const info = getAQIInfo(aqi);
        const pct  = Math.min(aqi / 500, 1);
        const r = 70, cx = 90, cy = 90;
        const circ = 2 * Math.PI * r;
        const dashOffset = circ * (1 - pct * 0.75); // 270 degree sweep

        el.innerHTML = `
        <svg width="180" height="140" viewBox="0 0 180 140" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#00e400"/>
                    <stop offset="50%" stop-color="#ffde33"/>
                    <stop offset="100%" stop-color="#cc0033"/>
                </linearGradient>
            </defs>
            <!-- Track -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="14"
                stroke-dasharray="${circ}" stroke-dashoffset="${circ * 0.25}"
                stroke-linecap="round" transform="rotate(135 ${cx} ${cy})"/>
            <!-- Fill -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${info.color}" stroke-width="14"
                stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
                stroke-linecap="round" transform="rotate(135 ${cx} ${cy})"
                style="transition: stroke-dashoffset 1s ease-out;"/>
            <!-- Center text -->
            <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="28" font-weight="900"
                fill="${info.textColor}" font-family="Outfit,sans-serif">${aqi}</text>
            <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" font-weight="700"
                fill="${info.textColor}" font-family="Outfit,sans-serif">${info.label}</text>
            <text x="${cx}" y="${cy + 28}" text-anchor="middle" font-size="18">${info.icon}</text>
        </svg>`;
    }

    return { render, getAQIInfo };
})();

/* ----------------------------------------------------------------
   PDF TREE PASSPORT
   Certificate-style PDF using jsPDF
   ---------------------------------------------------------------- */
const PDFPassport = (() => {
    function generate(data) {
        if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            alert('PDF library not loaded. Please ensure jsPDF is included.');
            return;
        }

        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const W = 297, H = 210;

        // Background
        doc.setFillColor(244, 255, 244);
        doc.rect(0, 0, W, H, 'F');

        // Green border
        doc.setDrawColor(126, 217, 87);
        doc.setLineWidth(3);
        doc.rect(8, 8, W - 16, H - 16, 'S');
        doc.setLineWidth(1);
        doc.rect(12, 12, W - 24, H - 24, 'S');

        // Header band
        doc.setFillColor(27, 67, 50);
        doc.rect(8, 8, W - 16, 28, 'F');

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(126, 217, 87);
        doc.text('TREE PLANTATION CALCULATOR', W / 2, 22, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('ENVIRONMENTAL IMPACT PASSPORT', W / 2, 31, { align: 'center' });

        // Eco Tree icon area (left column)
        doc.setFillColor(126, 217, 87, 0.2);
        doc.roundedRect(18, 44, 72, 80, 4, 4, 'F');
        doc.setFontSize(40);
        doc.text('🌳', 54, 78, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(27, 67, 50);
        doc.text(data.species || 'Tree Species', 54, 92, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(61, 106, 83);
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 54, 100, { align: 'center' });
        doc.text(`Location: ${data.city || 'India'}`, 54, 107, { align: 'center' });

        // Main content
        const col2X = 98, col3X = 200;
        const startY = 46;

        // Section: Carbon Impact
        doc.setFillColor(76, 175, 80);
        doc.roundedRect(col2X, startY, 95, 10, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('CARBON & OXYGEN IMPACT', col2X + 47.5, startY + 7, { align: 'center' });

        const rows1 = [
            ['Trees Planted', `${(data.trees || 0).toLocaleString('en-IN')}`],
            ['Years Projected', `${data.years || 10} years`],
            ['CO₂ Absorbed', `${(data.co2 || 0).toLocaleString('en-IN')} kg`],
            ['Oxygen Generated', `${(data.oxygen || 0).toLocaleString('en-IN')} kg/yr`],
        ];

        let y = startY + 14;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        rows1.forEach(([label, value], i) => {
            doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 255 : 255, i % 2 === 0 ? 245 : 255);
            doc.rect(col2X, y, 95, 8, 'F');
            doc.setTextColor(61, 106, 83);
            doc.text(label, col2X + 3, y + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(27, 67, 50);
            doc.text(value, col2X + 92, y + 5.5, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            y += 9;
        });

        // Section: Environmental Benefits
        y += 4;
        doc.setFillColor(27, 67, 50);
        doc.roundedRect(col2X, y, 95, 10, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(126, 217, 87);
        doc.text('ENVIRONMENTAL BENEFITS', col2X + 47.5, y + 7, { align: 'center' });

        y += 14;
        const rows2 = [
            ['Temperature Reduction', `${data.tempReduction || '~1-3'}°C`],
            ['Water Conservation', `${data.water ? (data.water/1000).toFixed(1) + ' kL/yr' : 'N/A'}`],
            ['Canopy Coverage', `${data.canopy || '~500'} m²`],
            ['Budget Used', `₹${(data.budget || 0).toLocaleString('en-IN')}`],
        ];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        rows2.forEach(([label, value], i) => {
            doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 255 : 255, i % 2 === 0 ? 245 : 255);
            doc.rect(col2X, y, 95, 8, 'F');
            doc.setTextColor(61, 106, 83);
            doc.text(label, col2X + 3, y + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(27, 67, 50);
            doc.text(value, col2X + 92, y + 5.5, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            y += 9;
        });

        // Environmental Score box
        doc.setFillColor(244, 255, 244);
        doc.setDrawColor(126, 217, 87);
        doc.setLineWidth(1);
        doc.roundedRect(col3X, 44, 78, 80, 4, 4, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(27, 67, 50);
        doc.text('ENVIRONMENTAL', col3X + 39, 56, { align: 'center' });
        doc.text('SCORE', col3X + 39, 63, { align: 'center' });

        const score = data.envScore || 72;
        doc.setFontSize(42);
        doc.setTextColor(76, 175, 80);
        doc.text(`${score}`, col3X + 39, 90, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(61, 106, 83);
        doc.text('/100', col3X + 56, 90);

        const scoreLabel = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Average' : 'Needs Work';
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(76, 175, 80);
        doc.text(scoreLabel, col3X + 39, 103, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 130, 100);
        doc.text('Sustainability Rating', col3X + 39, 110, { align: 'center' });
        doc.text(`Species: ${data.species || 'Mixed'}`, col3X + 39, 116, { align: 'center' });

        // Footer
        doc.setFillColor(244, 255, 244);
        doc.setFontSize(8);
        doc.setTextColor(100, 130, 100);
        doc.setFont('helvetica', 'italic');
        doc.text(
            'Generated by Tree Plantation Calculator | Environmental Sustainability Platform | ' + new Date().toLocaleString('en-IN'),
            W / 2, H - 14, { align: 'center' }
        );

        doc.save(`tree-passport-${(data.species || 'report').toLowerCase().replace(' ', '-')}-${Date.now()}.pdf`);
    }

    return { generate };
})();

/* ----------------------------------------------------------------
   CSV EXPORTER
   ---------------------------------------------------------------- */
const CSVExporter = (() => {
    function exportRows(headers, rows, filename) {
        const lines = [headers.join(',')];
        rows.forEach(row => lines.push(row.map(v => `"${v}"`).join(',')));
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename || 'export.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportCalculation(data) {
        const headers = ['Field', 'Value'];
        const rows = Object.entries(data).map(([k, v]) => [k, v]);
        exportRows(headers, rows, `tpc-export-${Date.now()}.csv`);
    }

    return { exportRows, exportCalculation };
})();

/* ----------------------------------------------------------------
   SCROLL REVEAL PLUS
   Enhanced IntersectionObserver
   ---------------------------------------------------------------- */
const ScrollRevealPlus = (() => {
    let observer;

    function init() {
        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const delay = parseInt(el.dataset.delay || '0');
                    setTimeout(() => {
                        el.classList.add('visible');
                        // Trigger count-up if applicable
                        if (el.dataset.countup && typeof CountUpAnimator !== 'undefined') {
                            const target = parseFloat(el.dataset.countup) || 0;
                            const suffix = el.dataset.suffix || '';
                            const duration = parseInt(el.dataset.duration) || 2000;
                            CountUpAnimator.animate(el, target, duration, suffix);
                        }
                    }, delay);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.12 });

        document.querySelectorAll('.fade-up, .fade-in, .fade-left, .fade-right').forEach(el => {
            observer.observe(el);
        });
    }

    function observeNew() {
        if (!observer) { init(); return; }
        document.querySelectorAll('.fade-up:not(.visible), .fade-in:not(.visible)').forEach(el => {
            observer.observe(el);
        });
    }

    return { init, observeNew };
})();

/* ----------------------------------------------------------------
   ENVIRONMENTAL BENEFITS COUNTER
   Animated counter block
   ---------------------------------------------------------------- */
const EnvBenefits = (() => {
    function compute(numTrees, years, co2PerTree) {
        const co2Rate = co2PerTree || 22;
        return {
            co2:   Math.round(numTrees * co2Rate * years),
            o2:    Math.round(numTrees * 1450 * years / 1000),
            water: Math.round(numTrees * 4500 * years / 1000),
            temp:  parseFloat((numTrees / 100 * 0.8).toFixed(2)),
            canopy:Math.round(numTrees * 28)
        };
    }
    return { compute };
})();

/* ----------------------------------------------------------------
   GREEN CITY SCORE ENGINE
   ---------------------------------------------------------------- */
const GreenCityEngine = (() => {
    function calculate(aqi, treeDensity, population, greenCover) {
        // Normalize inputs to 0-100 sub-scores
        const aqiScore        = Math.max(0, Math.min(100, 100 - (aqi - 0) / 5));
        const treeDensScore   = Math.min(100, treeDensity / 6);
        const popDensScore    = Math.max(0, 100 - (population * 10));
        const greenCoverScore = Math.min(100, greenCover * 2.5);

        const total = Math.round(
            aqiScore * 0.35 +
            treeDensScore * 0.30 +
            greenCoverScore * 0.25 +
            popDensScore * 0.10
        );

        return {
            total: Math.max(0, Math.min(100, total)),
            breakdown: { aqiScore, treeDensScore, popDensScore, greenCoverScore }
        };
    }

    function getLabel(score) {
        if (score >= 85) return { label: 'Eco Champion 🏆', cls: 'score-excellent', color: '#00c853' };
        if (score >= 70) return { label: 'Excellent 🌟',    cls: 'score-excellent', color: '#7ED957' };
        if (score >= 55) return { label: 'Good 👍',          cls: 'score-good',      color: '#a5d6a7' };
        if (score >= 40) return { label: 'Average ⚠️',      cls: 'score-average',   color: '#ffd600' };
        if (score >= 25) return { label: 'Poor 😟',          cls: 'score-poor',      color: '#ff9800' };
        return                  { label: 'Critical 🚨',     cls: 'score-critical',  color: '#f44336' };
    }

    function getSuggestions(score, breakdown) {
        const tips = [];
        if (breakdown.aqiScore < 50) tips.push('🌿 Plant more pollution-tolerant species like Neem, Peepal and Arjun along major roads.');
        if (breakdown.treeDensScore < 50) tips.push('🌳 Increase tree density — target at least 300 trees per 1,000 residents.');
        if (breakdown.greenCoverScore < 50) tips.push('🏞️ Expand green cover — aim for 25%+ with urban forests and parks.');
        if (breakdown.popDensScore < 50) tips.push('🏙️ High population density detected. Prioritize vertical greenery and rooftop gardens.');
        if (score < 40) tips.push('🚨 Urgent: Initiate a city-wide plantation drive. Even 10,000 trees can shift AQI by 15 points.');
        if (tips.length === 0) tips.push('✅ This city demonstrates excellent sustainability practices. Maintain and expand green corridors.');
        return tips;
    }

    return { calculate, getLabel, getSuggestions };
})();

/* ----------------------------------------------------------------
   INITIALIZE ON DOM READY
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    NavManager.init();
    ScrollRevealPlus.init();
    TabManager.init();
    if (typeof CountUpAnimator !== 'undefined') {
        // CountUpAnimator.animateAll() is triggered by ScrollRevealPlus on intersection
    }
});

// Expose globals
window.TabManager        = TabManager;
window.ForecastEngine    = ForecastEngine;
window.SpeciesFilter     = SpeciesFilter;
window.PlantationCalendar= PlantationCalendar;
window.AQIGauge          = AQIGauge;
window.PDFPassport       = PDFPassport;
window.CSVExporter       = CSVExporter;
window.ScrollRevealPlus  = ScrollRevealPlus;
window.EnvBenefits       = EnvBenefits;
window.GreenCityEngine   = GreenCityEngine;
window.NavManager        = NavManager;
