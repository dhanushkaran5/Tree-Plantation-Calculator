// Tree Map Visualizer Logic

let map;
let markers = [];
let currentEditingPin = null;

// Initialize map
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Leaflet map (centered on India)
    map = L.map('map').setView([20.5937, 78.9629], 5);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Load existing pins
    loadPins();

    // Handle map clicks
    map.on('click', (e) => {
        addPin(e.latlng.lat, e.latlng.lng);
    });

    // Handle pin form submission
    document.getElementById('pinForm').addEventListener('submit', (e) => {
        e.preventDefault();
        savePin();
    });

    // Update summaries
    updateSummaries();
});

// Add a new pin
function addPin(lat, lng) {
    const defaultSpecies = document.getElementById('mapSpecies').value;
    
    // Create pin object
    const pin = {
        lat: lat,
        lng: lng,
        species: defaultSpecies,
        count: 1,
        years: 1,
        location: ''
    };

    // Save pin
    const savedPin = MapPins.save(pin);
    
    // Add marker to map
    addMarker(savedPin);
    
    // Open edit modal
    editPin(savedPin.id);
    
    updateSummaries();
}

// Add marker to map
function addMarker(pin) {
    const species = pin.species || 'Unknown';
    const count = pin.count || 1;
    const tree = getTreeData(species);
    const co2PerYear = tree ? (tree.co2PerYear || tree) : 20;
    const totalCO2 = co2PerYear * count * (pin.years || 1);
    
    // Create custom icon
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #2c6e49; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🌳</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const marker = L.marker([pin.lat, pin.lng], { icon: icon })
        .addTo(map)
        .bindPopup(`
            <strong>${species}</strong><br>
            Trees: ${count}<br>
            CO₂: ${Utils.formatNumber(Math.round(totalCO2))} kg
            ${pin.location ? `<br>Location: ${pin.location}` : ''}
            <br><button onclick="editPin(${pin.id})" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #2c6e49; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit</button>
        `);

    marker.pinId = pin.id;
    markers.push(marker);
}

// Load all pins from localStorage
function loadPins() {
    const pins = MapPins.getAll();
    pins.forEach(pin => {
        addMarker(pin);
    });
}

// Edit pin
function editPin(pinId) {
    const pins = MapPins.getAll();
    const pin = pins.find(p => p.id === pinId);
    
    if (!pin) return;

    currentEditingPin = pin;
    
    document.getElementById('pinId').value = pin.id;
    document.getElementById('pinSpecies').value = pin.species || 'Neem';
    document.getElementById('pinCount').value = pin.count || 1;
    document.getElementById('pinLocation').value = pin.location || '';
    document.getElementById('pinYears').value = pin.years || 1;
    
    Utils.showModal('pinModal');
}

// Save pin changes
function savePin() {
    if (!currentEditingPin) return;

    const pinId = parseInt(document.getElementById('pinId').value);
    const species = document.getElementById('pinSpecies').value;
    const count = parseInt(document.getElementById('pinCount').value);
    const location = document.getElementById('pinLocation').value;
    const years = parseInt(document.getElementById('pinYears').value);

    // Update pin in localStorage
    const pins = MapPins.getAll();
    const pinIndex = pins.findIndex(p => p.id === pinId);
    
    if (pinIndex !== -1) {
        pins[pinIndex].species = species;
        pins[pinIndex].count = count;
        pins[pinIndex].location = location;
        pins[pinIndex].years = years;
        
        Storage.set(STORAGE_KEYS.MAP_PINS, pins);
        
        // Remove old marker
        const markerIndex = markers.findIndex(m => m.pinId === pinId);
        if (markerIndex !== -1) {
            map.removeLayer(markers[markerIndex]);
            markers.splice(markerIndex, 1);
        }
        
        // Add updated marker
        addMarker(pins[pinIndex]);
        
        updateSummaries();
        closePinModal();
        Utils.showAlert('Pin updated successfully!', 'success');
    }
}

// Delete pin
function deletePin() {
    if (!currentEditingPin) return;

    const pinId = parseInt(document.getElementById('pinId').value);
    
    // Remove from localStorage
    MapPins.delete(pinId);
    
    // Remove marker from map
    const markerIndex = markers.findIndex(m => m.pinId === pinId);
    if (markerIndex !== -1) {
        map.removeLayer(markers[markerIndex]);
        markers.splice(markerIndex, 1);
    }
    
    updateSummaries();
    closePinModal();
    Utils.showAlert('Pin deleted successfully!', 'success');
}

// Close pin modal
function closePinModal() {
    Utils.hideModal('pinModal');
    currentEditingPin = null;
}

// Clear all pins
function clearAllPins() {
    if (confirm('Are you sure you want to clear all pins? This action cannot be undone.')) {
        // Remove all markers from map
        markers.forEach(marker => {
            map.removeLayer(marker);
        });
        markers = [];
        
        // Clear localStorage
        Storage.remove(STORAGE_KEYS.MAP_PINS);
        
        updateSummaries();
        Utils.showAlert('All pins cleared!', 'success');
    }
}

// Export map data
function exportMapData() {
    const pins = MapPins.getAll();
    
    if (pins.length === 0) {
        Utils.showAlert('No pins to export', 'error');
        return;
    }

    const csv = [
        ['Latitude', 'Longitude', 'Species', 'Count', 'Location', 'Years', 'Total CO₂ (kg)']
    ];

    pins.forEach(pin => {
        const tree = getTreeData(pin.species);
        const co2PerYear = tree ? (tree.co2PerYear || tree) : 20;
        const totalCO2 = co2PerYear * (pin.count || 1) * (pin.years || 1);
        csv.push([
            pin.lat,
            pin.lng,
            pin.species || 'Unknown',
            pin.count || 1,
            pin.location || 'N/A',
            pin.years || 1,
            Math.round(totalCO2)
        ]);
    });

    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecotree_map_data_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Update location and species summaries
function updateSummaries() {
    const pins = MapPins.getAll();
    
    // Location summary
    const locationSummary = document.getElementById('locationSummary');
    const locationData = {};
    
    pins.forEach(pin => {
        const location = pin.location || 'Unknown Location';
        if (!locationData[location]) {
            locationData[location] = { trees: 0, co2: 0 };
        }
        locationData[location].trees += pin.count || 0;
        const tree = getTreeData(pin.species);
        const co2PerYear = tree ? (tree.co2PerYear || tree) : 20;
        locationData[location].co2 += co2PerYear * (pin.count || 1) * (pin.years || 1);
    });

    if (Object.keys(locationData).length === 0) {
        locationSummary.innerHTML = '<p>No pins added yet. Click on the map to add tree locations.</p>';
    } else {
        let html = '';
        Object.entries(locationData).forEach(([location, data]) => {
            html += `
                <div class="pin-info">
                    <strong>${location}</strong><br>
                    Trees: ${Utils.formatNumber(data.trees)}<br>
                    Total CO₂: ${Utils.formatNumber(Math.round(data.co2))} kg
                </div>
            `;
        });
        locationSummary.innerHTML = html;
    }

    // Species summary
    const speciesSummary = document.getElementById('speciesSummary');
    const speciesData = {};
    
    pins.forEach(pin => {
        const species = pin.species || 'Unknown';
        if (!speciesData[species]) {
            speciesData[species] = { count: 0, trees: 0 };
        }
        speciesData[species].count += 1;
        speciesData[species].trees += pin.count || 0;
    });

    if (Object.keys(speciesData).length === 0) {
        speciesSummary.innerHTML = '<p>No species data available.</p>';
    } else {
        let html = '';
        Object.entries(speciesData).forEach(([species, data]) => {
            html += `
                <div class="pin-info">
                    <strong>${species}</strong><br>
                    Locations: ${data.count}<br>
                    Total Trees: ${Utils.formatNumber(data.trees)}
                </div>
            `;
        });
        speciesSummary.innerHTML = html;
    }

    // Update pins list
    updatePinsList();
}

// Update pins list
function updatePinsList() {
    const pins = MapPins.getAll();
    const pinsList = document.getElementById('pinsList');
    
    if (pins.length === 0) {
        pinsList.innerHTML = '<p>No pins added yet.</p>';
        return;
    }

    let html = '<div style="display: grid; gap: 1rem;">';
    pins.forEach(pin => {
        const tree = getTreeData(pin.species);
        const co2PerYear = tree ? (tree.co2PerYear || tree) : 20;
        const totalCO2 = co2PerYear * (pin.count || 1) * (pin.years || 1);
        
        html += `
            <div class="leaderboard-item">
                <div>
                    <strong>${pin.species || 'Unknown'}</strong><br>
                    <small>${pin.location || 'No location'}</small><br>
                    <small>Lat: ${pin.lat.toFixed(4)}, Lng: ${pin.lng.toFixed(4)}</small>
                </div>
                <div style="text-align: right;">
                    <div>Trees: ${pin.count || 1}</div>
                    <div>CO₂: ${Utils.formatNumber(Math.round(totalCO2))} kg</div>
                    <button class="btn btn-outline" style="margin-top: 0.5rem; padding: 0.25rem 0.75rem;" onclick="editPin(${pin.id})">Edit</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    pinsList.innerHTML = html;
}

// Make functions available globally
window.editPin = editPin;
window.closePinModal = closePinModal;
window.deletePin = deletePin;
window.clearAllPins = clearAllPins;
window.exportMapData = exportMapData;



