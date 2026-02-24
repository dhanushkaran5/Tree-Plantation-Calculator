function ready(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

ready(() => {
  setupGrowthVisualizer();
  setupCityInsights();
  setupDashboardChart();
});

function setupGrowthVisualizer() {
  const slider = document.getElementById("growth-years");
  const valueEl = document.getElementById("growth-value");
  const progress = document.getElementById("growth-progress");
  if (!slider || !valueEl || !progress) return;

  const update = () => {
    const years = Number(slider.value);
    valueEl.textContent = years;
    const width = (years / 10) * 100;
    progress.style.width = `${width}%`;
  };

  slider.addEventListener("input", update);
  update();
}

function setupCityInsights() {
  const select = document.getElementById("city-select");
  const climateDetails = document.getElementById("climate-details");
  const recList = document.getElementById("recommendation-list");
  const data = window.appData;
  if (!select || !climateDetails || !recList || !data) return;

  const cityMap = new Map(data.cities.map((city) => [String(city.id), city]));

  const render = (cityId) => {
    const city = cityMap.get(String(cityId));
    if (!city) return;

    climateDetails.innerHTML = `
      <p class="climate-label">${city.climate.charAt(0).toUpperCase() + city.climate.slice(1)} climate</p>
      <p>${city.climateDescription || "Climate description unavailable."}</p>
    `;

    recList.innerHTML = "";
    if (city.recommendations && city.recommendations.length) {
      city.recommendations.forEach((tree) => {
        const li = document.createElement("li");
        li.textContent = tree;
        recList.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No tailored recommendations";
      recList.appendChild(li);
    }
  };

  select.addEventListener("change", (event) => render(event.target.value));
  if (select.value) {
    render(select.value);
  }
}

function setupDashboardChart() {
  const canvas = document.getElementById("co2-chart");
  const payload = window.dashboardData;
  if (!canvas || !payload || !window.Chart) return;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, "rgba(31, 140, 77, 0.5)");
  gradient.addColorStop(1, "rgba(31, 140, 77, 0.05)");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: payload.labels,
      datasets: [
        {
          label: "CO₂ saved (kg)",
          data: payload.values,
          fill: true,
          backgroundColor: gradient,
          borderColor: "#1f8c4d",
          tension: 0.35,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `${value} kg`,
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y.toFixed(1)} kg CO₂`,
          },
        },
      },
    },
  });
}
