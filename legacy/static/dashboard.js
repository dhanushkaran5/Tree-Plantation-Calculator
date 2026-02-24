// Dashboard Logic

let speciesChart = null;
let co2Chart = null;
let aqiBenefitChart = null;

const Dashboard = {
    init() {
        loadUserProgress();
        loadProgressBars();
        loadLeaderboard();
        drawCharts();
        loadCarbonScore();
        drawAqiBenefitChart();
        loadGoalTracker();
        loadGlobalImpact();
    },
    resetData() {
        if (!confirm('This will clear all stored calculations, goals, and progress. Continue?')) {
            return;
        }
        Storage.remove(STORAGE_KEYS.CALCULATIONS);
        Storage.remove(STORAGE_KEYS.USER_PROGRESS);
        Storage.remove(STORAGE_KEYS.ACHIEVEMENTS);
        Storage.remove('ecotree_goals');
        loadUserProgress();
        loadProgressBars();
        loadLeaderboard();
        drawCharts();
        loadCarbonScore();
        drawAqiBenefitChart();
        loadGoalTracker();
        loadGlobalImpact();
        Utils.showAlert('Dashboard data reset successfully.', 'success');
    }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());

// Load user progress
function loadUserProgress() {
    const progress = Calculations.getProgress();
    const calculations = Calculations.getAll();

    document.getElementById('userTotalTrees').textContent = Utils.formatNumber(progress.totalTrees);
    document.getElementById('userTotalCO2').textContent = Utils.formatNumber(Math.round(progress.totalCO2));
    document.getElementById('userCalculations').textContent = calculations.length;
}


// Load progress bars
function loadProgressBars() {
    const progress = Calculations.getProgress();
    const progressBars = document.getElementById('progressBars');

    const achievements = [
        { name: 'Seed Planter', target: 10, current: progress.totalTrees, unit: 'trees' },
        { name: 'Eco Warrior', target: 100, current: progress.totalTrees, unit: 'trees' },
        { name: 'City Saver', target: 1000, current: progress.totalCO2, unit: 'kg CO₂' }
    ];

    let html = '';
    achievements.forEach(achievement => {
        const percentage = Math.min((achievement.current / achievement.target) * 100, 100);
        html += `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong>${achievement.name}</strong>
                    <span>${Utils.formatNumber(achievement.current)} / ${Utils.formatNumber(achievement.target)} ${achievement.unit}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%;">
                        ${Math.round(percentage)}%
                    </div>
                </div>
            </div>
        `;
    });

    progressBars.innerHTML = html;
}

// Load leaderboard
function loadLeaderboard() {
    const leaderboard = Leaderboard.getCityLeaderboard();
    const leaderboardList = document.getElementById('leaderboardList');

    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<p>No city data available yet. Start adding trees to see rankings!</p>';
        return;
    }

    let html = '<div style="margin-top: 1rem;">';
    leaderboard.forEach((entry, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
        
        html += `
            <div class="leaderboard-item">
                <div style="display: flex; align-items: center;">
                    <span class="leaderboard-rank">${medal} ${rank}</span>
                    <div>
                        <strong>${entry.city}</strong>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div>Trees: ${Utils.formatNumber(entry.trees)}</div>
                    <div>CO₂: ${Utils.formatNumber(Math.round(entry.co2))} kg</div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    leaderboardList.innerHTML = html;
}

// Draw charts
function drawCharts() {
    drawSpeciesChart();
    drawCO2Chart();
}

// Draw species distribution chart
function drawSpeciesChart() {
    const ctx = document.getElementById('speciesChart').getContext('2d');
    const progress = Calculations.getProgress();
    const speciesData = progress.speciesCount || {};

    if (Object.keys(speciesData).length === 0) {
        document.getElementById('speciesChart').parentElement.innerHTML = '<p>No species data available yet.</p>';
        return;
    }

    const labels = Object.keys(speciesData);
    const data = Object.values(speciesData);

    if (speciesChart) {
        speciesChart.destroy();
    }

    speciesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(44, 110, 73, 0.8)',
                    'rgba(26, 77, 46, 0.8)',
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(139, 195, 74, 0.8)',
                    'rgba(205, 220, 57, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(255, 152, 0, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                },
                title: {
                    display: false
                }
            }
        }
    });
}

// Draw CO2 absorption over time chart
function drawCO2Chart() {
    const ctx = document.getElementById('co2Chart').getContext('2d');
    const calculations = Calculations.getAll();

    if (calculations.length === 0) {
        document.getElementById('co2Chart').parentElement.innerHTML = '<p>No calculation data available yet.</p>';
        return;
    }

    // Sort by timestamp
    const sorted = calculations.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateA - dateB;
    });

    // Group by date (month)
    const monthlyData = {};
    sorted.forEach(calc => {
        const date = new Date(calc.timestamp || Date.now());
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += calc.totalCO2 || 0;
    });

    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(key => monthlyData[key]);

    if (co2Chart) {
        co2Chart.destroy();
    }

    co2Chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'CO₂ Absorbed (kg)',
                data: data,
                borderColor: '#2c6e49',
                backgroundColor: 'rgba(44, 110, 73, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'CO₂ (kg)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            }
        }
    });
}

function drawAqiBenefitChart() {
    const ctx = document.getElementById('aqiBenefitDashboard');
    if (!ctx) return;

    const toleranceMap = {
        'Very High': 'Hazardous',
        'High': 'Poor',
        'Medium': 'Moderate',
        'Low': 'Good'
    };

    const categories = ['Good', 'Moderate', 'Poor', 'Hazardous'];
    const categoryCounts = {
        Good: 0,
        Moderate: 0,
        Poor: 0,
        Hazardous: 0
    };

    const calculations = Calculations.getAll();
    calculations.forEach(calc => {
        const species = calc.species || 'Custom';
        const tree = getTreeData(species);
        const tolerance = tree?.pollutionTolerance || 'Medium';
        const category = toleranceMap[tolerance] || 'Moderate';
        categoryCounts[category] += calc.count || 0;
    });

    const data = categories.map(cat => categoryCounts[cat] || 0);

    if (aqiBenefitChart) {
        aqiBenefitChart.destroy();
    }

    aqiBenefitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Trees suited for AQI band',
                data,
                backgroundColor: ['#2c6e49', '#82c09a', '#f4a261', '#b5179e']
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
                    title: { text: 'Tree count', display: true }
                }
            }
        }
    });
}

// Load Carbon Neutrality Score
function loadCarbonScore() {
    const progress = Calculations.getProgress();
    const calculations = Calculations.getAll();
    
    const progressData = {
        totalTrees: progress.totalTrees || 0,
        totalCO2: progress.totalCO2 || 0,
        totalCalculations: calculations.length || 0
    };

    const score = CarbonNeutralityScore.calculate(progressData);
    const level = GAMIFICATION_LEVELS[score.level] || GAMIFICATION_LEVELS['Seed Planter'];

    const scoreDisplay = document.getElementById('carbonScoreDisplay');
    
    let html = `
        <div class="metric-card" style="background: linear-gradient(135deg, ${level.color} 0%, ${level.color}dd 100%);">
            <div style="font-size: 1.5rem; margin-bottom: 1rem;">${level.icon} ${score.level}</div>
            <div class="metric-value">${score.score}/100</div>
            <div style="font-size: 1.2rem; margin-top: 1rem;">${score.percentage}%</div>
        </div>

        <div class="progress-bar" style="margin-top: 1.5rem; height: 40px;">
            <div class="progress-fill" style="width: ${score.percentage}%; background: linear-gradient(90deg, ${level.color} 0%, ${level.color}dd 100%);">
                <span style="color: white; font-weight: bold; font-size: 1.1rem;">${score.percentage}%</span>
            </div>
        </div>

        <div style="margin-top: 1.5rem;">
            <h3>Score Breakdown:</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div class="result-item">
                    <div>
                        <strong>Tree Score</strong><br>
                        <small>Based on trees planted</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: var(--green-primary);">${score.breakdown.treeScore}/40</strong>
                    </div>
                </div>
                <div class="result-item">
                    <div>
                        <strong>CO₂ Score</strong><br>
                        <small>Based on CO₂ saved</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: var(--green-primary);">${score.breakdown.co2Score}/40</strong>
                    </div>
                </div>
                <div class="result-item">
                    <div>
                        <strong>Engagement Score</strong><br>
                        <small>Based on calculations</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: var(--green-primary);">${score.breakdown.engagementScore}/20</strong>
                    </div>
                </div>
            </div>
        </div>
    `;

    scoreDisplay.innerHTML = html;
}

// Load Goal Tracker
function loadGoalTracker() {
    const goalTracker = document.getElementById('goalTracker');
    
    // Get goals from localStorage
    const goals = Storage.get('ecotree_goals', {
        monthly: { target: 100, unit: 'kg', type: 'CO2' },
        annual: { target: 1000, unit: 'kg', type: 'CO2' },
        treesMonthly: { target: 10, unit: 'trees', type: 'trees' }
    });

    const progress = Calculations.getProgress();
    const calculations = Calculations.getAll();
    
    // Calculate current progress
    const monthlyCO2 = calculateMonthlyProgress(calculations);
    const annualCO2 = progress.totalCO2 || 0;
    const monthlyTrees = calculateMonthlyTrees(calculations);

    let html = `
        <div style="margin-top: 1.5rem;">
            <h3>Set Your Goals</h3>
            <form id="goalForm" onsubmit="updateGoals(event); return false;" style="display: grid; gap: 1rem; margin-top: 1rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    <div class="form-group">
                        <label>Monthly CO₂ Goal (kg)</label>
                        <input type="number" id="monthlyCO2Goal" min="1" value="${goals.monthly.target}" required>
                    </div>
                    <div class="form-group">
                        <label>Annual CO₂ Goal (kg)</label>
                        <input type="number" id="annualCO2Goal" min="1" value="${goals.annual.target}" required>
                    </div>
                    <div class="form-group">
                        <label>Monthly Tree Goal</label>
                        <input type="number" id="monthlyTreeGoal" min="1" value="${goals.treesMonthly.target}" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Update Goals</button>
            </form>
        </div>

        <div style="margin-top: 2rem;">
            <h3>Your Progress</h3>
            <div style="display: grid; gap: 1.5rem; margin-top: 1.5rem;">
    `;

    // Monthly CO2 Goal
    const monthlyProgress = Math.min(100, (monthlyCO2 / goals.monthly.target) * 100);
    html += `
        <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>Monthly CO₂ Goal</strong>
                <span>${Utils.formatNumber(Math.round(monthlyCO2))} / ${Utils.formatNumber(goals.monthly.target)} kg</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${monthlyProgress}%;">
                    ${Math.round(monthlyProgress)}%
                </div>
            </div>
        </div>
    `;

    // Annual CO2 Goal
    const annualProgress = Math.min(100, (annualCO2 / goals.annual.target) * 100);
    html += `
        <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>Annual CO₂ Goal</strong>
                <span>${Utils.formatNumber(Math.round(annualCO2))} / ${Utils.formatNumber(goals.annual.target)} kg</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${annualProgress}%;">
                    ${Math.round(annualProgress)}%
                </div>
            </div>
        </div>
    `;

    // Monthly Trees Goal
    const treeProgress = Math.min(100, (monthlyTrees / goals.treesMonthly.target) * 100);
    html += `
        <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>Monthly Tree Goal</strong>
                <span>${Utils.formatNumber(Math.round(monthlyTrees))} / ${Utils.formatNumber(goals.treesMonthly.target)} trees</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${treeProgress}%;">
                    ${Math.round(treeProgress)}%
                </div>
            </div>
        </div>
    `;

    html += `
            </div>
        </div>
    `;

    goalTracker.innerHTML = html;
}

// Calculate monthly CO2 progress
function calculateMonthlyProgress(calculations) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const thisMonth = calculations.filter(calc => {
        const date = new Date(calc.timestamp || 0);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    return thisMonth.reduce((sum, calc) => sum + (calc.totalCO2 || 0), 0);
}

// Calculate monthly trees
function calculateMonthlyTrees(calculations) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const thisMonth = calculations.filter(calc => {
        const date = new Date(calc.timestamp || 0);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    return thisMonth.reduce((sum, calc) => sum + (calc.count || 0), 0);
}

// Update goals
function updateGoals(event) {
    event.preventDefault();

    const goals = {
        monthly: {
            target: parseFloat(document.getElementById('monthlyCO2Goal').value),
            unit: 'kg',
            type: 'CO2'
        },
        annual: {
            target: parseFloat(document.getElementById('annualCO2Goal').value),
            unit: 'kg',
            type: 'CO2'
        },
        treesMonthly: {
            target: parseFloat(document.getElementById('monthlyTreeGoal').value),
            unit: 'trees',
            type: 'trees'
        }
    };

    Storage.set('ecotree_goals', goals);
    loadGoalTracker();
    Utils.showAlert('Goals updated successfully!', 'success');
}

// Load Global Impact
function loadGlobalImpact() {
    const globalImpact = document.getElementById('globalImpact');
    
    if (!globalImpact) return;

    const impact = GlobalImpact.calculateGlobalImpact();

    let html = `
        <div class="summary-grid" style="margin-top: 1.5rem;">
            <div class="summary-card">
                <h3>${Utils.formatNumber(impact.totalTrees)}</h3>
                <p>Total Trees Planted</p>
            </div>
            <div class="summary-card">
                <h3>${Utils.formatNumber(Math.round(impact.totalCO2))}</h3>
                <p>Total CO₂ Offset (kg)</p>
            </div>
            <div class="summary-card">
                <h3>${Utils.formatNumber(Math.round(impact.totalO2))}</h3>
                <p>Total O₂ Produced (kg)</p>
            </div>
            <div class="summary-card">
                <h3>${impact.peopleSupported}</h3>
                <p>People Supported</p>
            </div>
        </div>

        <div class="card" style="margin-top: 2rem;">
            <h3>Top Tree Species</h3>
            <div style="display: grid; gap: 1rem; margin-top: 1rem;">
    `;

    impact.topSpecies.forEach((species, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        html += `
            <div class="leaderboard-item">
                <div>
                    <span class="leaderboard-rank">${medal}</span>
                    <strong>${species.species}</strong>
                </div>
                <div style="text-align: right;">
                    <strong style="color: var(--green-primary);">${Utils.formatNumber(species.count)} trees</strong>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>

        ${Object.keys(impact.cityDistribution).length > 0 ? `
        <div class="card" style="margin-top: 2rem;">
            <h3>Trees by City</h3>
            <div style="display: grid; gap: 1rem; margin-top: 1rem;">
                ${Object.entries(impact.cityDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([city, count]) => `
                    <div class="leaderboard-item">
                        <div><strong>${city}</strong></div>
                        <div style="text-align: right;">
                            <strong style="color: var(--green-primary);">${Utils.formatNumber(count)} trees</strong>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;

    globalImpact.innerHTML = html;
}



