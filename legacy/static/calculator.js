// Carbon Calculator Logic

let currentCalculation = null;
let plannerTimelineChart = null;

// Initialize calculator
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calculatorForm');
    const speciesSelect = document.getElementById('species');

    // Handle species selection
    speciesSelect.addEventListener('change', (e) => {
        const isCustom = e.target.value === 'Custom';
        document.getElementById('customSpeciesGroup').style.display = isCustom ? 'block' : 'none';
        document.getElementById('customCO2Group').style.display = isCustom ? 'block' : 'none';

        if (isCustom) {
            document.getElementById('customSpeciesName').required = true;
            document.getElementById('customCO2').required = true;
        } else {
            document.getElementById('customSpeciesName').required = false;
            document.getElementById('customCO2').required = false;
        }
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateImpact();
    });

    populatePlannerSpecies();
    populateCityDropdown();
    document.getElementById('footprintCalcBtn').addEventListener('click', calculateTreesFromFootprint);
    document.getElementById('timelineCalcBtn').addEventListener('click', calculatePlannerTimeline);
});

// Calculate carbon impact
function calculateImpact() {
    const species = document.getElementById('species').value;
    const count = parseInt(document.getElementById('count').value);
    const years = parseInt(document.getElementById('years').value);
    const city = document.getElementById('calculatorCity').value;

    if (!species || !count || !years || !city) {
        Utils.showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (count > 1000000) {
        Utils.showAlert('Tree count is capped at 1,000,000 per scenario.', 'error');
        return;
    }

    let speciesName = species;
    let co2PerYear;

    if (species === 'Custom') {
        speciesName = document.getElementById('customSpeciesName').value;
        co2PerYear = parseFloat(document.getElementById('customCO2').value);

        if (!speciesName || !co2PerYear) {
            Utils.showAlert('Please enter custom species details', 'error');
            return;
        }
    } else {
        const tree = getTreeData(species);
        co2PerYear = tree ? (tree.co2PerYear || tree) : 20;
    }

    // Calculate CO2 absorption
    const annualCO2 = co2PerYear * count;
    const totalCO2 = annualCO2 * years;
    const totalCO2Tonnes = parseFloat(Utils.kgToTonnes(totalCO2));
    const carEquivalents = parseFloat(Utils.calculateCarEquivalents(totalCO2Tonnes));

    // Store calculation
    currentCalculation = {
        species: speciesName,
        count: count,
        years: years,
        co2PerYear: co2PerYear,
        annualCO2: annualCO2,
        totalCO2: totalCO2,
        totalCO2Tonnes: totalCO2Tonnes,
        carEquivalents: carEquivalents,
        location: city
    };

    // Save to localStorage
    Calculations.save(currentCalculation);

    // Display results
    displayResults(currentCalculation);

    // Draw chart
    // Draw chart removed
    // drawChart(currentCalculation);

    Utils.showAlert('Calculation saved successfully!', 'success');
}

// Display calculation results
function displayResults(calc) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');

    resultsContent.innerHTML = `
        <div class="results">
            <div class="result-item">
                <span><strong>Species:</strong> ${calc.species}</span>
            </div>
            <div class="result-item">
                <span><strong>Number of Trees:</strong> ${Utils.formatNumber(calc.count)}</span>
            </div>
            <div class="result-item">
                <span><strong>CO₂ Absorption Rate:</strong> ${calc.co2PerYear} kg per tree per year</span>
            </div>
            <div class="result-item">
                <span><strong>Annual CO₂ Absorption:</strong> ${Utils.formatNumber(calc.annualCO2)} kg (${calc.totalCO2Tonnes} tonnes)</span>
            </div>
            <div class="result-item">
                <span><strong>Total CO₂ over ${calc.years} years:</strong> ${Utils.formatNumber(calc.totalCO2)} kg (${calc.totalCO2Tonnes} tonnes)</span>
            </div>
            <div class="result-item">
                <span><strong>Car Equivalents Offset:</strong> ${calc.carEquivalents} cars (4.6 tonnes per car per year)</span>
            </div>
            ${calc.location ? `<div class="result-item">
                <span><strong>City:</strong> ${calc.location}</span>
            </div>` : ''}
        </div>
    `;

    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Draw CO2 absorption chart - REMOVED

// Reset calculator
function resetCalculator() {
    document.getElementById('calculatorForm').reset();
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('customSpeciesGroup').style.display = 'none';
    document.getElementById('customCO2Group').style.display = 'none';
    const citySelect = document.getElementById('calculatorCity');
    if (citySelect) {
        citySelect.value = '';
    }
    currentCalculation = null;

    if (plannerTimelineChart) {
        // Keep planner chart logic if needed, or remove if that was also requested. 
        // User said "remove csv and graph in calculator", usually refers to the main result graph.
        // I will leave planner chart as it's a "Planning Helper".
    }
}

function populatePlannerSpecies() {
    const speciesOptions = Object.keys(TREE_SPECIES)
        .map(species => `<option value="${species}">${species}</option>`)
        .join('');
    ['footprintSpecies', 'plannerSpecies'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `<option value="">Select species</option>${speciesOptions}`;
        }
    });
}

function populateCityDropdown() {
    const citySelect = document.getElementById('calculatorCity');
    if (!citySelect) return;
    const cities = typeof INDIAN_CITIES !== 'undefined'
        ? Object.keys(INDIAN_CITIES).sort()
        : [];
    const options = cities.length
        ? cities.map(city => `<option value="${city}">${city}</option>`).join('')
        : `
            <option value="Delhi">Delhi</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Chennai">Chennai</option>
        `;
    citySelect.innerHTML = `<option value="">Select a city</option>${options}`;
}

function calculateTreesFromFootprint() {
    const footprint = parseFloat(document.getElementById('annualFootprint').value);
    const species = document.getElementById('footprintSpecies').value || 'Neem';

    if (!footprint || footprint <= 0) {
        Utils.showAlert('Enter a valid CO₂ footprint.', 'error');
        return;
    }

    const tree = getTreeData(species);
    const co2PerYear = tree?.co2PerYear || 20;
    const treesNeeded = Math.ceil(footprint / co2PerYear);
    const fiveYearAbsorption = treesNeeded * co2PerYear * 5;

    const result = `
        Need approximately <strong>${treesNeeded}</strong> ${species} trees.<br>
        Annual absorption: <strong>${Utils.formatNumber(treesNeeded * co2PerYear)}</strong> kg.<br>
        Five-year absorption: <strong>${Utils.formatNumber(fiveYearAbsorption)}</strong> kg.
    `;
    const resultEl = document.getElementById('footprintPlannerResult');
    resultEl.innerHTML = result;
    resultEl.style.display = 'block';
}

function calculatePlannerTimeline() {
    const trees = parseInt(document.getElementById('plannerTreeCount').value, 10);
    const species = document.getElementById('plannerSpecies').value || 'Neem';

    if (!trees || trees <= 0) {
        Utils.showAlert('Enter a valid tree count.', 'error');
        return;
    }

    const tree = getTreeData(species);
    const co2PerYear = tree?.co2PerYear || 20;
    const intervals = [5, 10, 20];
    const timeline = intervals.map(years => trees * co2PerYear * years);

    const ctx = document.getElementById('plannerTimelineChart').getContext('2d');
    if (plannerTimelineChart) {
        plannerTimelineChart.destroy();
    }

    plannerTimelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: intervals.map(years => `${years} yrs`),
            datasets: [{
                label: `CO₂ absorbed by ${species}`,
                data: timeline,
                borderColor: '#2c6e49',
                backgroundColor: 'rgba(44, 110, 73, 0.15)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'CO₂ (kg)' }
                }
            }
        }
    });

    const summary = `
        ${trees} ${species} trees absorb ${Utils.formatNumber(timeline[0])} kg in 5 yrs,
        ${Utils.formatNumber(timeline[1])} kg in 10 yrs, and
        ${Utils.formatNumber(timeline[2])} kg in 20 yrs.
    `;
    const summaryEl = document.getElementById('timelineSummary');
    summaryEl.innerHTML = summary;
    summaryEl.style.display = 'block';
}

// Export to CSV - REMOVED

// Generate PDF Tree Passport
function generatePDF() {
    if (!currentCalculation) {
        Utils.showAlert('No calculation to generate PDF', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(44, 110, 73);
    doc.text('EcoTree Impact Analyzer', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Tree Passport', 105, 30, { align: 'center' });

    // Line separator
    doc.setDrawColor(44, 110, 73);
    doc.line(20, 35, 190, 35);

    let yPos = 45;

    // Species Information
    doc.setFontSize(14);
    doc.text('Species Information', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Species: ${currentCalculation.species}`, 20, yPos);
    yPos += 7;
    doc.text(`Number of Trees: ${currentCalculation.count}`, 20, yPos);
    yPos += 7;
    doc.text(`CO₂ Absorption Rate: ${currentCalculation.co2PerYear} kg/tree/year`, 20, yPos);
    yPos += 7;
    if (currentCalculation.location) {
        doc.text(`Location: ${currentCalculation.location}`, 20, yPos);
        yPos += 7;
    }

    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // CO2 Absorption Table
    doc.setFontSize(14);
    doc.text('Year-by-Year CO₂ Absorption', 20, yPos);
    yPos += 10;

    // Table header
    doc.setFontSize(10);
    doc.setFillColor(44, 110, 73);
    doc.rect(20, yPos - 5, 170, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Year', 25, yPos);
    doc.text('Annual CO₂ (kg)', 80, yPos);
    doc.text('Cumulative CO₂ (kg)', 140, yPos);

    yPos += 5;
    doc.setTextColor(0, 0, 0);

    // Table rows
    let cumulative = 0;
    for (let year = 1; year <= currentCalculation.years; year++) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        const growthFactor = 0.5 + (year / currentCalculation.years) * 0.5;
        const yearCO2 = currentCalculation.annualCO2 * growthFactor;
        cumulative += yearCO2;

        doc.text(year.toString(), 25, yPos);
        doc.text(Math.round(yearCO2).toString(), 80, yPos);
        doc.text(Math.round(cumulative).toString(), 140, yPos);
        yPos += 6;
    }

    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total CO₂ Absorbed: ${Utils.formatNumber(currentCalculation.totalCO2)} kg (${currentCalculation.totalCO2Tonnes} tonnes)`, 20, yPos);
    yPos += 7;
    doc.text(`Car Equivalents Offset: ${currentCalculation.carEquivalents} cars`, 20, yPos);

    // QR Code
    yPos += 15;
    const qrData = `${window.location.origin}${window.location.pathname}?calc=${currentCalculation.id || Date.now()}`;

    QRCode.toDataURL(qrData, { width: 60, margin: 1 }, (err, url) => {
        if (!err) {
            doc.addImage(url, 'PNG', 145, yPos - 10, 30, 30);
        }
        doc.setFontSize(8);
        doc.text('Scan for details', 145, yPos + 25);

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 280, { align: 'center' });

        // Save PDF
        doc.save(`Tree_Passport_${currentCalculation.species}_${Date.now()}.pdf`);
    });
}



