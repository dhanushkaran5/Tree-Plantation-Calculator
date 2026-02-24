# EcoTree Impact Analyzer

A complete, production-ready website for calculating carbon reduction from tree plantations, visualizing planting locations on a map, comparing pollution between cities, and generating PDF "tree passports."

## Features

### 1. Home Page
- Modern hero section with quick carbon calculator
- Summary cards showing total trees, CO₂ saved, and top species
- Navigation to all modules

### 2. Carbon Reduction Calculator
- Choose from 7 predefined tree species or create custom species
- Calculate annual and cumulative CO₂ absorption
- Visualize CO₂ absorption over time with Chart.js
- Export results to CSV
- Generate PDF "Tree Passport" with QR code
- Compare species absorption rates

### 3. Tree Map Visualizer
- Interactive Leaflet.js map
- Drop pins for planted trees
- Select species and count for each location
- View location and species summaries
- Export map data to CSV

### 4. Bulk CSV Upload Analyzer
- Upload CSV files with tree data (species, count, location)
- Auto-generate total CO₂ saved
- Species distribution charts
- Map visualization of locations

### 5. City Pollution Comparator
- Compare pollution levels across 5 major Indian cities
- Fetch live AQI data using OpenAQ API
- Calculate trees needed to offset annual emissions
- Species recommendations based on pollution levels

### 6. Dashboard & Leaderboard
- Track user progress and achievements
- Achievement badges (Seed Planter, Eco Warrior, City Saver)
- City leaderboard ranking
- Statistics charts (species distribution, CO₂ over time)

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Libraries**:
  - Chart.js - Data visualization
  - Leaflet.js - Interactive maps
  - jsPDF - PDF generation
  - QRCode.js - QR code generation
  - PapaParse - CSV parsing
- **Storage**: localStorage (client-side data persistence)
- **APIs**: OpenAQ API for pollution data

## Project Structure

```
eco-tree/
├── index.html              # Home page
├── calculator.html          # Carbon calculator
├── map.html                # Map visualizer
├── bulk.html               # Bulk CSV upload
├── pollution.html          # City pollution comparator
├── dashboard.html          # Dashboard & leaderboard
├── static/
│   ├── style.css           # Global styles
│   ├── script.js           # Shared utilities
│   ├── calculator.js       # Calculator logic
│   ├── map.js              # Map logic
│   ├── bulk.js             # Bulk upload logic
│   ├── pollution.js        # Pollution comparator logic
│   └── dashboard.js        # Dashboard logic
└── assets/
    ├── logo.png            # Logo placeholder
    └── icons/              # Icon files
```

## Getting Started

1. **Start the backend (recommended)**: Use the SQLite-powered Flask API in `backend/` (see section below) to persist all progress, pins, achievements, and accounts.
2. **Open the project**: Visit `http://127.0.0.1:5000/` after starting the backend, or open `index.html` directly for an offline-only experience.
3. **Start calculating**: Use the calculator to start tracking your carbon impact.

## Persistent Storage Backend

The project now ships with a lightweight Flask service that syncs every `ecotree_*` localStorage entry into `backend/eco_tree.db`, so your data survives browser refreshes and can be shared across devices.

1. Open a terminal and `cd backend`
2. Create a virtual environment (optional but recommended):
   - `python -m venv .venv`
   - `.\.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (macOS/Linux)
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `python app.py`
5. Visit `http://127.0.0.1:5000/` to use the full experience. All API endpoints live under `/api` (e.g., `/api/health`, `/api/bootstrap`, `/api/store`).

The SQLite file `backend/eco_tree.db` is safe to back up or copy into CI environments. The server automatically creates and migrates the `kv_store` table on startup.

## Usage

### Calculator
1. Select a tree species (or create custom)
2. Enter number of trees and years
3. Click "Calculate" to see results
4. View the chart showing CO₂ absorption over time
5. Export to CSV or generate PDF passport

### Map Visualizer
1. Click anywhere on the map to add a pin
2. Edit pin details (species, count, location)
3. View summaries by location and species
4. Export map data to CSV

### Bulk Upload
1. Prepare a CSV file with columns: `species`, `count`, `location`
2. Upload the file
3. View species distribution charts and map visualization
4. Save locations to the map

### Pollution Comparator
1. Select a city from the dropdown
2. View current AQI and pollution levels
3. See tree recommendations to offset emissions
4. Compare all cities at once

### Dashboard
1. View your progress and achievements
2. Check city leaderboard rankings
3. Analyze statistics with interactive charts

## Data Persistence

- The backend keeps a durable copy of every `ecotree_*` key inside the SQLite `kv_store` table, so calculations, pins, goals, users, and achievements survive browser refreshes and can be restored on new devices.
- The frontend mirrors the same data into `localStorage` for instant, offline-first reads. When the backend is unreachable, the app gracefully falls back to the local cache.

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Notes

- The OpenAQ API may have rate limits. The app includes fallback mock data for demonstration.
- Map coordinates for cities are approximate. For production, use a geocoding API.
- All calculations are client-side only - no backend server required.

## License

This project is open source and available for use.




