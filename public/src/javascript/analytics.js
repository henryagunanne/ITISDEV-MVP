// const socket = io();

$(document).ready(function () {
    // Init
    loadReports();
    loadPlayers();
});


// SAFE number formatter
function safeNumber(value) {
    const num = Number(value);
    return !isNaN(num) ? num.toFixed(1) : "0.0";
}

  
// Load data initially
async function loadReports() {
    const season = document.getElementById('seasonFilter').value;
    const opponent = document.getElementById('opponentFilter').value;

    const res = await fetch(`/api/analytics/summary?season=${season}&opponent=${opponent}`);
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
  const res = await fetch('/api/analytics/players');
  const players = await res.json();

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
}

// Charts
function renderCharts(data) {
  new Chart(document.getElementById('pointsChart'), {
    type: 'line',
    data: {
      labels: data.games,
      datasets: [{ label: 'Points', data: data.points }]
    }
  });

  new Chart(document.getElementById('winLossChart'), {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [{
        data: [data.wins, data.losses]
      }]
    }
  });
}

// Export CSV
function exportCSV() {
  window.location.href = "/api/analytics/export/csv";
}

// Export PDF
function exportCSV() {
    window.location.href = "/api/analytics/export/pdf";
}