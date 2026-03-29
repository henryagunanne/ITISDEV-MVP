// const socket = io();

let filters = {
  season: "",
  opponent: "",
  startDate: "",
  endDate: "",
  sortBy: "ppg" // default
};


let pointsChartInstance = null;
let winLossChartInstance = null;

$(document).ready(function () {
    // Init
    loadAnalytics();

    // update date attribute field on focus to date filter text
    $("#startDate, #endDate").on("focus", function() {
      $(this).attr("type", "date");
    });
    
    // update date attribute field on blur back to text
    $("#startDate, #endDate").on("blur", function() {
        if (!$(this).val()) {
            $(this).attr("type", "text");
        }
    });

    // 🔥 FILTER LISTENERS

    $("#seasonFilter").on("change", function () {
      filters.season = $(this).val();
      loadAnalytics();
    });

    $("#opponentFilter").on("change", function () {
        filters.opponent = $(this).val();
        loadAnalytics();
    });

    $("#startDate").on("change", function () {
        filters.startDate = $(this).val();
        loadAnalytics();
    });

    $("#endDate").on("change", function () {
        filters.endDate = $(this).val();
        loadAnalytics();
    });

    $("#sortBy").on("change", function () {
        filters.sortBy = $(this).val();
        loadPlayers(); // only reload table
    });

});


// SAFE number formatter
function safeNumber(value) {
    const num = Number(value);
    return !isNaN(num) ? num.toFixed(1) : "0.0";
}


function loadAnalytics() {
  loadReports();
  loadPlayers();
  loadInsights();
}
  
// Load data initially
async function loadReports() {
  const query = new URLSearchParams(filters).toString();

  const res = await fetch(`/api/analytics/summary?${query}`);
  const data = await res.json();

  document.getElementById('totalGames').innerText = data.totalGames;
  document.getElementById('winRate').innerText = data.winRate.toFixed(1) + "%";
  document.getElementById('avgPoints').innerText = safeNumber(data.avgPoints);
  document.getElementById('teamEfficiency').innerText = safeNumber(data.efficiency);

  renderCharts(data);
}


/*
// Real-time updates
socket.on('statsUpdated', () => {
  loadReports();
});
*/

// Player table
async function loadPlayers() {
  const query = new URLSearchParams(filters).toString();

  const players = await fetch(`/api/analytics/players?${query}`)
      .then(res => res.json());

  const table = document.getElementById('playerTable');
  table.innerHTML = "";

  players.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.name || "Unknown"}</td>
        <td>${safeNumber(p.ppg)}</td>
        <td>${safeNumber(p.rpg)}</td>
        <td>${safeNumber(p.apg)}</td>
        <td>${safeNumber(p.efficiency)}</td>
        <td>${safeNumber(p.tsPercentage)}</td>
        <td>${safeNumber(p.usageRate)}</td>
      </tr>
    `;
  });

  highlightColumn(); 
}

// Highlight best stat column dynamically
function highlightColumn() {
  const sortKey = filters.sortBy;

  $("#playerTable tr").each(function () {
      $(this).find("td").removeClass("table-success");

      if (sortKey === "ppg") $(this).find("td:eq(1)").addClass("table-success");
      if (sortKey === "rpg") $(this).find("td:eq(2)").addClass("table-success");
      if (sortKey === "apg") $(this).find("td:eq(3)").addClass("table-success");
      if (sortKey === "efficiency") $(this).find("td:eq(4)").addClass("table-success");
      if (sortKey === "tsPercentage") $(this).find("td:eq(5)").addClass("table-success");
  });
}

// Charts
function renderCharts(data) {

  // DESTROY OLD CHARTS
  if (pointsChartInstance) pointsChartInstance.destroy();
  if (winLossChartInstance) winLossChartInstance.destroy();

  // TRANSFORM DATA FROM BACKEND
  const labels = data.games.map(g =>
      `${g.opponent} (${new Date(g.date).toLocaleDateString()})`
  );

  const teamPoints = data.games.map(g => g.points);
  const opponentPoints = data.games.map(g => g.opponentPoints);

  const pointColors = data.games.map(g =>
      g.result === "W" ? "green" : "red"
  );

  // LINE CHART (TEAM VS OPPONENT)
  pointsChartInstance = new Chart(document.getElementById('pointsChart'), {
      type: 'line',
      data: {
          labels,
          datasets: [
              {
                  label: 'Team Score',
                  data: teamPoints,
                  tension: 0.3,
                  backgroundColor: '#006F3C'
              },
              {
                  label: 'Opponent Score',
                  data: opponentPoints,
                  tension: 0.3,
                  backgroundColor: '#dc3545'
              },
          ]
      },
      options: {
          responsive: true,
          plugins: {
              legend: { display: true }
          }
      },
      borderColor: 'green',
      pointBackgroundColor: pointColors
  });

  // WIN / LOSS CHART
  winLossChartInstance = new Chart(document.getElementById('winLossChart'), {
      type: 'doughnut',
      data: {
          labels: ['Wins', 'Losses'],
          datasets: [{
              data: [data.wins || 0, data.losses || 0],
              backgroundColor: ['#006F3C', '#dc3545']
          }]
      },
      options: {
          responsive: true
      }
  });
}

// Export CSV
function exportCSV() {
  window.open("/api/analytics/export/csv", '_blank');
}

// Export PDF
function exportPDF() {
    window.open("/api/analytics/export/pdf", '_blank');
}

async function loadInsights() {
  const query = new URLSearchParams(filters).toString();

  const res = await fetch(`/api/analytics/insights?${query}`);
  const data = await res.json();

  document.getElementById("aiInsights").innerText = data.insights;
}