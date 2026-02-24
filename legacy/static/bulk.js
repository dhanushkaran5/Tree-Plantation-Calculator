// Bulk CSV Upload Logic

let bulkData = [];
let bulkMap = null;
let speciesChart = null;
let bulkMarkers = [];

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }

    if (!file.name.endsWith('.csv')) {
        Utils.showAlert('Please select a CSV file', 'error');
        return;
    }

    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<div class="spinner"></div><p>Processing CSV file...</p>';

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                statusDiv.innerHTML = `<div class="alert alert-error">Error parsing CSV: ${results.errors[0].message}</div>`;
                return;
            }

            processBulkData(results.data);
            statusDiv.innerHTML = '<div class="alert alert-success">CSV file processed successfully!</div>';
        },
        error: function(error) {
            statusDiv.innerHTML = `<div class="alert alert-error">Error reading file: ${error.message}</div>`;
        }
    });
}

// Process bulk data
function processBulkData(data) {
    bulkData = [];
    
    data.forEach((row, index) => {
        // Validate required fields
        if (!row.species || !row.count) {
            console.warn(`Row ${index + 1} missing required fields, skipping...`);
            return;
        }

        const species = row.species.trim();
        const count = parseInt(row.count);
        const location = row.location ? row.location.trim() : '';

        if (isNaN(count) || count < 1) {
            console.warn(`Row ${index + 1} has invalid count, skipping...`);
            return;
        }

        const tree = getTreeData(species);
        const co2PerYear = tree ? (tree.co2PerYear || tree) : 20; // Default to 20 if species not found
        const totalCO2 = co2PerYear * count;

        bulkData.push({
            species: species,
            count: count,
            location: location,
            co2PerYear: co2PerYear,
            totalCO2: totalCO2
        });
    });

    if (bulkData.length === 0) {
        Utils.showAlert('No valid data found in CSV file', 'error');
        return;
    }

    // Display results
    displayBulkResults();
}

// Display bulk results
function displayBulkResults() {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    // Calculate totals
    const totalTrees = bulkData.reduce((sum, item) => sum + item.count, 0);
    const totalCO2 = bulkData.reduce((sum, item) => sum + item.totalCO2, 0);
    const locations = new Set(bulkData.filter(item => item.location).map(item => item.location));

    // Update summary cards
    document.getElementById('bulkTotalTrees').textContent = Utils.formatNumber(totalTrees);
    document.getElementById('bulkTotalCO2').textContent = Utils.formatNumber(Math.round(totalCO2));
    document.getElementById('bulkLocations').textContent = locations.size;

    // Draw species distribution chart
    drawSpeciesChart();

    // Draw map
    drawBulkMap();

    // Display data table
    displayDataTable();
}

// Draw species distribution chart
function drawSpeciesChart() {
    const ctx = document.getElementById('speciesChart').getContext('2d');

    // Calculate species totals
    const speciesData = {};
    bulkData.forEach(item => {
        if (!speciesData[item.species]) {
            speciesData[item.species] = { count: 0, co2: 0 };
        }
        speciesData[item.species].count += item.count;
        speciesData[item.species].co2 += item.totalCO2;
    });

    const labels = Object.keys(speciesData);
    const treeCounts = labels.map(species => speciesData[species].count);
    const co2Values = labels.map(species => speciesData[species].co2);

    // Destroy existing chart
    if (speciesChart) {
        speciesChart.destroy();
    }

    speciesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Number of Trees',
                    data: treeCounts,
                    backgroundColor: 'rgba(44, 110, 73, 0.6)',
                    borderColor: '#2c6e49',
                    borderWidth: 2
                },
                {
                    label: 'CO₂ Absorbed (kg)',
                    data: co2Values,
                    backgroundColor: 'rgba(26, 77, 46, 0.6)',
                    borderColor: '#1a4d2e',
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
                    text: 'Species Distribution'
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
                        text: 'Number of Trees'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'CO₂ (kg)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Draw bulk map
function drawBulkMap() {
    // Initialize map if not already done
    if (!bulkMap) {
        bulkMap = L.map('bulkMap').setView([20.5937, 78.9629], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(bulkMap);
    } else {
        // Clear existing markers
        bulkMarkers.forEach(marker => bulkMap.removeLayer(marker));
        bulkMarkers = [];
    }

    // Group data by location
    const locationData = {};
    bulkData.forEach(item => {
        if (!item.location) return;
        
        if (!locationData[item.location]) {
            locationData[item.location] = {
                trees: 0,
                co2: 0,
                species: {}
            };
        }
        locationData[item.location].trees += item.count;
        locationData[item.location].co2 += item.totalCO2;
        locationData[item.location].species[item.species] = 
            (locationData[item.location].species[item.species] || 0) + item.count;
    });

    // For demo purposes, use approximate coordinates for Indian cities
    // In production, you'd use geocoding API
    const cityCoordinates = {};
    // Populate from INDIAN_CITIES if available
    if (typeof INDIAN_CITIES !== 'undefined') {
        Object.keys(INDIAN_CITIES).forEach(city => {
            cityCoordinates[city] = [INDIAN_CITIES[city].lat, INDIAN_CITIES[city].lng];
        });
    } else {
        // Fallback to basic cities
        cityCoordinates['Delhi'] = [28.6139, 77.2090];
        cityCoordinates['Mumbai'] = [19.0760, 72.8777];
        cityCoordinates['Chennai'] = [13.0827, 80.2707];
        cityCoordinates['Bangalore'] = [12.9716, 77.5946];
        cityCoordinates['Hyderabad'] = [17.3850, 78.4867];
        cityCoordinates['Kolkata'] = [22.5726, 88.3639];
        cityCoordinates['Pune'] = [18.5204, 73.8567];
        cityCoordinates['Jaipur'] = [26.9124, 75.7873];
        cityCoordinates['Ahmedabad'] = [23.0225, 72.5714];
    }

    // Add markers for each location
    Object.entries(locationData).forEach(([location, data]) => {
        let coords = cityCoordinates[location] || [20.5937, 78.9629]; // Default to India center
        
        // Add some random offset for multiple entries in same city
        if (Object.keys(locationData).filter(l => l === location).length > 1) {
            coords = [coords[0] + (Math.random() - 0.5) * 0.1, coords[1] + (Math.random() - 0.5) * 0.1];
        }

        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #2c6e49; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🌳</div>`,
            iconSize: [35, 35],
            iconAnchor: [17, 17]
        });

        const marker = L.marker(coords, { icon: icon })
            .addTo(bulkMap)
            .bindPopup(`
                <strong>${location}</strong><br>
                Trees: ${Utils.formatNumber(data.trees)}<br>
                CO₂: ${Utils.formatNumber(Math.round(data.co2))} kg<br>
                Species: ${Object.keys(data.species).join(', ')}
            `);

        bulkMarkers.push(marker);
    });

    // Fit map to show all markers
    if (bulkMarkers.length > 0) {
        const group = new L.featureGroup(bulkMarkers);
        bulkMap.fitBounds(group.getBounds().pad(0.1));
    }
}

// Display data table
function displayDataTable() {
    const tableDiv = document.getElementById('dataTable');
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">';
    html += '<thead><tr style="background-color: var(--green-primary); color: white;">';
    html += '<th style="padding: 0.75rem; text-align: left;">Species</th>';
    html += '<th style="padding: 0.75rem; text-align: right;">Count</th>';
    html += '<th style="padding: 0.75rem; text-align: left;">Location</th>';
    html += '<th style="padding: 0.75rem; text-align: right;">CO₂ (kg)</th>';
    html += '</tr></thead><tbody>';

    bulkData.forEach((item, index) => {
        html += `<tr style="background-color: ${index % 2 === 0 ? '#f5f5f5' : 'white'}; border-bottom: 1px solid #ddd;">`;
        html += `<td style="padding: 0.75rem;">${item.species}</td>`;
        html += `<td style="padding: 0.75rem; text-align: right;">${Utils.formatNumber(item.count)}</td>`;
        html += `<td style="padding: 0.75rem;">${item.location || 'N/A'}</td>`;
        html += `<td style="padding: 0.75rem; text-align: right;">${Utils.formatNumber(Math.round(item.totalCO2))}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    tableDiv.innerHTML = html;
}

// Export bulk results
function exportBulkResults() {
    if (bulkData.length === 0) {
        Utils.showAlert('No data to export', 'error');
        return;
    }

    const csv = [
        ['Species', 'Count', 'Location', 'CO₂ per Year (kg)', 'Total CO₂ (kg)']
    ];

    bulkData.forEach(item => {
        csv.push([
            item.species,
            item.count,
            item.location || 'N/A',
            item.co2PerYear,
            Math.round(item.totalCO2)
        ]);
    });

    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecotree_bulk_results_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Save to map
function saveToMap() {
    if (bulkData.length === 0) {
        Utils.showAlert('No data to save', 'error');
        return;
    }

    // For each item with a location, create a map pin
    let savedCount = 0;
    bulkData.forEach(item => {
        if (item.location) {
            // Get approximate coordinates (in production, use geocoding)
            const cityCoordinates = {};
            // Populate from INDIAN_CITIES if available
            if (typeof INDIAN_CITIES !== 'undefined') {
                Object.keys(INDIAN_CITIES).forEach(city => {
                    cityCoordinates[city] = [INDIAN_CITIES[city].lat, INDIAN_CITIES[city].lng];
                });
            } else {
                // Fallback to basic cities
                cityCoordinates['Delhi'] = [28.6139, 77.2090];
                cityCoordinates['Mumbai'] = [19.0760, 72.8777];
                cityCoordinates['Chennai'] = [13.0827, 80.2707];
                cityCoordinates['Bangalore'] = [12.9716, 77.5946];
                cityCoordinates['Hyderabad'] = [17.3850, 78.4867];
                cityCoordinates['Kolkata'] = [22.5726, 88.3639];
                cityCoordinates['Pune'] = [18.5204, 73.8567];
                cityCoordinates['Jaipur'] = [26.9124, 75.7873];
                cityCoordinates['Ahmedabad'] = [23.0225, 72.5714];
            }

            const coords = cityCoordinates[item.location];
            if (coords) {
                const pin = {
                    lat: coords[0] + (Math.random() - 0.5) * 0.05,
                    lng: coords[1] + (Math.random() - 0.5) * 0.05,
                    species: item.species,
                    count: item.count,
                    location: item.location,
                    years: 1
                };
                MapPins.save(pin);
                savedCount++;
            }
        }
    });

    if (savedCount > 0) {
        Utils.showAlert(`${savedCount} locations saved to map! Visit the Map page to view them.`, 'success');
    } else {
        Utils.showAlert('No valid locations found to save', 'error');
    }
}


