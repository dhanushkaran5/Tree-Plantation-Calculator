# 🌿 Tree Plantation Calculator

**India's Premier Environmental Sustainability & Carbon Analytics Platform**

> A production-quality, research-grade web platform for calculating tree plantation impact, analyzing city air quality, scoring urban sustainability, and planning large-scale green initiatives — for NGOs, CSR teams, smart-city planners, and environmental researchers.

---

## ✨ Features

### 🧮 Calculator Center (6 Integrated Calculators)
| Calculator | Description |
|---|---|
| **Carbon Offset** | CO₂ absorption over 1–100 years across 42+ Indian species |
| **Budget Planner** | How many trees can ₹500 → ₹10 Lakh plant? |
| **Temperature Reduction** | Urban heat island effect from plantation |
| **Green City Score** | 0–100 sustainability score for any Indian city |
| **Environmental Impact** | Combined oxygen, water, soil, biodiversity metrics |
| **Tree Comparison** | Side-by-side species analysis |

### 🌬️ City Pollution & AQI Analysis
- AQI, PM2.5, PM10, humidity, temperature data for **100+ Indian cities**
- Climate zone badges (Tropical, Subtropical, Arid, etc.)
- AI-matched tree species recommendations based on local pollution profile
- Seasonal plantation suitability calendar

### 🏙️ Green City Score
- 0–100 sustainability score based on AQI + tree density + green cover + population
- Circular progress ring animation
- Radar chart showing all dimensions
- Improvement action suggestions
- City rankings table (Top 10 cleanest vs. most polluted)

### 📈 Impact Dashboard
- Live animated counters (6 environmental metrics)
- **50-Year Forecast Slider** — interactive projection of CO₂ absorption
- Species distribution pie chart
- Monthly plantation trend chart
- Achievement badges system
- Recent calculations timeline
- PDF Report generation

### 📄 PDF Tree Passport
- Certificate-style downloadable PDF with QR code
- Includes species info, CO₂ data, location, year, and environmental impact
- Available on every calculator result

### 💾 Data Export
- CSV export for all calculations
- QR code generation for sharing results

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5 + Vanilla CSS + Vanilla JS (ES6+) |
| **Charts** | Chart.js (line, bar, radar, pie, doughnut) |
| **PDF** | jsPDF 2.5.1 |
| **QR Codes** | QRCode.js 1.5.3 |
| **Typography** | Google Fonts – Outfit + Poppins |
| **Backend (Python)** | Flask + SQLite (`backend/`) |
| **Backend (Node.js)** | Express + better-sqlite3 (`server/`) |
| **Data Storage** | localStorage (offline-first) + SQLite (persistent sync) |

---

## 🗂️ Project Structure

```
ecotree impact analyzer/
├── legacy/                        ← Main frontend
│   ├── index.html                 ← Homepage with hero, species explorer, budget calc
│   ├── calculator.html            ← Calculator Center (6 tabs)
│   ├── pollution.html             ← City AQI analysis
│   ├── green-city-score.html      ← Sustainability scoring
│   ├── impact-dashboard.html      ← Analytics dashboard
│   ├── roi-analyzer.html          ← Return on investment calculator
│   ├── advanced-calculator.html   ← Extended species calculator
│   ├── city-heatmap.html          ← City pollution heatmap
│   ├── smart_tools/               ← AI-powered smart tools
│   │   └── temperature_reducer.html
│   ├── static/
│   │   ├── style.css              ← Design system (glassmorphism, dark mode)
│   │   ├── tpc-core.js            ← Core utilities (TabManager, ForecastEngine, PDF, etc.)
│   │   ├── script.js              ← TREE_SPECIES database (42+ species)
│   │   ├── cities-data.js         ← INDIAN_CITIES database (100+ cities)
│   │   ├── calculator.js          ← Carbon calculator logic
│   │   ├── budget-calculator.js   ← Budget planner logic
│   │   ├── pollution.js           ← City AQI analysis logic
│   │   ├── premium-modules.js     ← GreenCityScore, DarkModeToggle, etc.
│   │   ├── climate-features.js    ← Plantation calendar, climate analysis
│   │   ├── simulation-features.js ← Environmental simulations
│   │   └── advanced-features.js   ← Advanced analytics
│   └── backend/                   ← Python/Flask backend (optional)
│       ├── app.py
│       └── requirements.txt
└── server/                        ← Node.js/Express backend (optional)
    ├── app.js
    ├── package.json
    ├── routes/
    │   └── api.js
    └── README.md
```

---

## 🚀 Getting Started

For full installation instructions, including Supabase PostgreSQL setup and Vercel deployment, please see the **root [README.md](../README.md)**.

### Option 1: Open Directly (No Server)
The frontend is offline-capable. Simply open `legacy/index.html` in any modern browser. Note that data will only save to localStorage in this mode.

### Option 2: Run with Backend (PostgreSQL)
Please follow the root README.md to configure your `.env` file with `DATABASE_URL` before running the Python or Node.js backend.

---

## 🌳 Species Database

42+ Indian tree species with:
- CO₂ absorption rate (kg/year)
- Water conservation potential
- Cooling effect (°C per 100 trees)
- Oxygen production rate
- Growth speed classification
- Soil type compatibility
- Climate zone suitability

---

## 🏙️ Cities Database

100+ Indian cities including all state capitals, tier-1 and tier-2 cities, with:
- AQI, PM2.5, PM10 pollution levels
- Climate zone + subzone classification
- Average temperature and rainfall
- Relative humidity
- Tree density per 1,000 residents
- Green cover percentage
- Population data
- Seasonal plantation suitability

---

## 📊 Environmental Calculations

All calculations are based on peer-reviewed environmental science:

- **CO₂ Absorption**: Species-specific absorption rates × climate index × tree count × years
- **O₂ Production**: ~1.07 kg O₂ per kg CO₂ absorbed (photosynthesis equation)
- **Water Conservation**: Species water-holding coefficient × leaf area index
- **Temperature Reduction**: Urban heat island mitigation model (0.1–0.8°C per 100 trees)
- **Green City Score**: Weighted composite of AQI (35%), tree density (30%), green cover (25%), population density (10%)

---

## 🖥️ Browser Compatibility

| Browser | Status |
|---|---|
| Chrome 90+ | ✅ Full support |
| Firefox 88+ | ✅ Full support |
| Edge 90+ | ✅ Full support |
| Safari 14+ | ✅ Full support |

---

## 📄 License

This project is open source. Built for India's environmental future.

---

## 🤝 Data Sources

- [Ministry of Environment, Forest and Climate Change (MoEFCC)](https://www.moefcc.gov.in/)
- [Forest Survey of India](https://www.fsi.nic.in/)
- [IUCN Red List](https://www.iucnredlist.org/)
- [OpenAQ API](https://www.openaq.org/) — for reference pollution data
- [Central Pollution Control Board (CPCB)](https://cpcb.nic.in/)
