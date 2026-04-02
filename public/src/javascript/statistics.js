/* 
    Handles the interactiviy, logic and frontend requests of the statistics viewing page
*/

const API = '';

let selectedGameId = null;
let stat;
let teamChart, shootingChart;
let insightsTimer = null;

const socket = io(); // Initialize socket for the analytics viewer

// Load games into dropdown
$(document).ready(function () {
    loadGames();

    $('#game-select').change(function () {
        // If we were already listening to another game, leave that room first
        if (selectedGameId) {
            socket.emit('leave_game', selectedGameId); // You'll need to add this to server.js
        }

        selectedGameId = $(this).val();
        stat = $(this).find(':selected').data('status');
        if (selectedGameId) {
            // Join the new game's room
            socket.emit('join_game', selectedGameId);

            loadStats(selectedGameId);
            loadInsights(selectedGameId);
        }
    });

    $('#manual-input-btn').click(function () {
        if (!selectedGameId) {
            alert('Please select a game first');
            return;
        }

        if (stat === "ENDED"){
            alert('This game is already ended');
            return;
        }

        window.location.href = `/admin/manual-stats?gameId=${selectedGameId}`;
    });

    
    $('#live-input-btn').click(function () {
        window.location.href = `/admin/start-game`;
    });

});

// LISTEN FOR LIVE UPDATES
socket.on('stat_recorded', () => {
    console.log("Live stat recorded! Refreshing charts...");
    
    // Automatically re-fetch the data and redraw the charts
    if (selectedGameId) {
        // Instantly reload the numerical stats and charts (cheap & fast)
        loadStats(selectedGameId);

        // Debounce the AI Insights (expensive & slow)
        // Clear the existing timer if a new stat comes in before the timer finishes
        if (insightsTimer) {
            clearTimeout(insightsTimer);
        }

        // Optional: Show a "generating" indicator on the UI so the user knows it's updating
        $('#insights-box').html('<div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading...</span></div> <span class="text-muted small">Updating insights...</span>');

        // Set a new timer. It will only execute if 15 seconds pass WITHOUT another stat being recorded.
        insightsTimer = setTimeout(() => {
            console.log("Play settled. Fetching new AI Insights...");
            loadInsights(selectedGameId);
        }, 15000); // 15,000 milliseconds = 15 seconds
         
    }
});

/*
// Listen for the live clock updates
socket.on('clock_updated', (data) => {
    $('#analytics-game-clock').text(data.gameClock); // If there is a clock UI on the analytics page, update it
});
*/

socket.on('event_undone', () => {
    console.log("An event was undone. Refreshing stats and insights...");
    if (selectedGameId) {
        loadStats(selectedGameId);
       
        if (insightsTimer) {
            clearTimeout(insightsTimer);
        }

        // Optional: Show a "generating" indicator on the UI so the user knows it's updating
        $('#insights-box').html('<div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading...</span></div> <span class="text-muted small">Updating insights...</span>');

        // Set a new timer. It will only execute if 15 seconds pass WITHOUT another stat being recorded.
        insightsTimer = setTimeout(() => {
            console.log("Play settled. Fetching new AI Insights...");
            loadInsights(selectedGameId);
        }, 15000); // 15,000 milliseconds = 15 seconds
    }
});


function loadGames() {
    $.get(`${API}/api/games/all-games`, function (res) {
        const games = res.data || [];

        let html = `<option value="">Select Game</option>`;
        games.forEach(g => {
            html += `<option value="${g._id}" data-status="${g.status}">
                vs ${g.opponent} (${new Date(g.gameDate).toLocaleDateString()})
            </option>`;
        });

        $('#game-select').html(html);
    });
}

// Load stats for selected game
function loadStats(gameId) {
    $.get(`${API}/api/games/${gameId}/stats`, function (res) {

        const stats = res.stats || res; // handle both formats

        renderTable(stats);
        renderTeamSummary(stats);
    });
}

// Load AI generated game insights
function loadInsights(gameId) {
    $.get(`/api/games/${gameId}/insights`, function (res) {

        const data = res.insights;

        // Ensure data exists and has at least one key with content
        if (!data || Object.keys(data).length === 0) {
            $('#insights-box').html("No insights available");
            return;
        }

        $('#insights-box').html(formatInsights(data));

    }).fail(function (err) {
        console.error("Insights error:", err);
        $('#insights-box').html("Failed to load insights");
    });
}

// helper to improve insights UI display
function formatInsights(data) {
    let html = "";

    // Safely check and render each section from the JSON
    if (data.keyInsights && data.keyInsights.length > 0) {
        html += createCard("Key Insights", data.keyInsights);
    } 
    
    if (data.strengthsAndWeaknesses && data.strengthsAndWeaknesses.length > 0) {
        html += createCard("Strengths & Weaknesses", data.strengthsAndWeaknesses);
    } 
    
    if (data.tacticalSuggestions && data.tacticalSuggestions.length > 0) {
        html += createCard("Tactical Suggestions", data.tacticalSuggestions);
    }
    
    if (data.winProbability) {
        html += createCard("Win Probability", data.winProbability);
    }

    return html;
}

// helper to improve insights UI display
function createCard(title, content) {
    let contentHtml = "";

    // Check if the content is an array (for our bullet points) or a string (for win prob)
    if (Array.isArray(content)) {
        contentHtml = `<ul>`;
        content.forEach(item => {
            // Optional: Basic bolding replacement if AI still slips in markdown
            let formattedItem = item.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            contentHtml += `<li>${formattedItem}</li>`;
        });
        contentHtml += `</ul>`;
    } else {
        // Handle simple strings
        contentHtml = `<p class="mb-0">${content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    }

    return `
        <div class="insight-card mb-3">
            <h6 class="fw-bold text-success">${title}</h6>
            <div class="text-muted small">
                ${contentHtml}
            </div>
        </div>
    `;
}

// render player stats table
function renderTable(stats) {
    let html = '';

    stats.forEach(s => {
        if (s.team !== 'lasalle') return;

        const t = s.totals || {};

        html += `
        <tr>
            <td>${s.playerId?.jerseyNumber || '-'}</td>
            <td>${s.playerId?.firstName || 'Unknown'} ${s.playerId?.lastName || 'Unknown'}</td>
            <td>${t.points || 0}</td>
            <td>${t.fieldGoalsMade || 0}/${t.fieldGoalsAttempted || 0}</td>
            <td>${t.threePointersMade || 0}/${t.threePointersAttempted || 0}</td>
            <td>${t.freeThrowsMade || 0}/${t.freeThrowsAttempted || 0}</td>
            <td>${(t.offensiveRebounds || 0) + (t.defensiveRebounds || 0)}</td>
            <td>${t.assists || 0}</td>
            <td>${t.steals || 0}</td>
            <td>${t.blocks || 0}</td>
            <td>${t.turnovers || 0}</td>
            <td>${t.fouls || 0}</td>
        </tr>`;
    });

    $('#stats-table-body').html(html || `
        <tr><td colspan="12" class="text-center text-muted">No stats available</td></tr>
    `);
}

// Aggregate team stats
function renderTeamSummary(stats) {
    const home = { pts: 0, fgm: 0, fga: 0, reb: 0, ast: 0, tpm:0, tpa: 0, ftm: 0, fta: 0 };
    const opp = { pts: 0, fgm: 0, fga: 0, reb: 0, ast: 0, tpm:0, tpa: 0, ftm: 0, fta: 0 };

    stats.forEach(s => {
        const t = s.totals || {};
        const target = s.team === 'lasalle' ? home : opp;

        const fgm = t.fieldGoalsMade + t.threePointersMade;
        const fga = t.fieldGoalsAttempted + t.threePointersAttempted;

        target.pts += t.points || 0;
        target.fgm += fgm || 0;
        target.fga += fga || 0;
        target.reb += (t.offensiveRebounds || 0) + (t.defensiveRebounds || 0);
        target.ast += t.assists || 0;
        target.tpm += t.threePointersMade;
        target.tpa += t.threePointersAttempted;
        target.ftm += t.freeThrowsMade;
        target.fta += t.freeThrowsAttempted;
    });

    const pct = (m, a) => a ? ((m / a) * 100).toFixed(1) : '0.0';

    $('#home-pts').text(home.pts);
    $('#home-fg').text(pct(home.fgm, home.fga) + '%');
    $('#home-reb').text(home.reb);
    $('#home-ast').text(home.ast);

    $('#opp-pts').text(opp.pts);
    $('#opp-fg').text(pct(opp.fgm, opp.fga) + '%');
    $('#opp-reb').text(opp.reb);
    $('#opp-ast').text(opp.ast);

    renderCharts(home, opp);
    // generateInsights(home, opp);
}


function renderCharts(home, opp) {

    const pct = (m, a) => a ? (m / a * 100).toFixed(1) : 0;

    // Destroy old charts
    if (teamChart) teamChart.destroy();
    if (shootingChart) shootingChart.destroy();

    const pointColors = home.pts > opp.pts ? 'green' : 'red';
  

    // TEAM COMPARISON
    teamChart = new Chart(document.getElementById('teamChart'), {
        type: 'bar',
        data: {
            labels: ['PTS', 'REB', 'AST'],
            datasets: [
                {
                    label: 'La Salle',
                    data: [home.pts, home.reb, home.ast],
                    backgroundColor: '#006F3C',
                    // borders to the bars
                    borderColor: '#004d2a', 
                    borderWidth: 1
                },
                {
                    label: 'Opponent',
                    data: [opp.pts, opp.reb, opp.ast],
                    backgroundColor: '#dc3545',
                    // Add borders to the bars
                    borderColor: '#a71d2a',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: {
                    beginAtZero: true 
                }
            }
        }
    });

    // SHOOTING %
    shootingChart = new Chart(document.getElementById('shootingChart'), {
        type: 'radar',
        data: {
            labels: ['FG%', '3PT%', 'FT%'],
            datasets: [
                {
                    label: 'La Salle',
                    data: [
                        pct(home.fgm, home.fga),
                        pct(home.tpm, home.tpa),
                        pct(home.ftm, home.fta)
                    ],
                    // Using rgba for 20% opacity so the shapes overlap visibly
                    backgroundColor: 'rgba(0, 111, 60, 0.2)', 
                    borderColor: '#006F3C',         
                    pointBackgroundColor: '#006F3C' 
                },
                {
                    label: 'Opponent',
                    data: [
                        pct(opp.fgm, opp.fga),
                        pct(opp.tpm, opp.tpa),
                        pct(opp.ftm, opp.fta)
                    ],
                    // Using rgba for 20% opacity
                    backgroundColor: 'rgba(220, 53, 69, 0.2)', 
                    borderColor: '#dc3545',        
                    pointBackgroundColor: '#dc3545' 
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true }
            },
            scales: {
                r: {
                    min: 0,
                    max: 100, // Locks the outer edge of the radar to 100%
                    ticks: {
                        stepSize: 20 // draws grid lines at 20, 40, 60, 80, 100
                    }
                }
            }
        }
    });
}


// defunct function**
function generateInsights(home, opp) {

    let insights = [];

    if (home.pts > opp.pts) {
        insights.push("La Salle is leading");
    } 
    if (home.pts < opp.pts) {
        insights.push("Opponent is leading");
    }

    const fgDiff = (home.fgm / home.fga) - (opp.fgm / opp.fga);

    if (fgDiff > 0.1) {
        insights.push("Strong shooting advantage");
    }

    if (home.reb > opp.reb) {
        insights.push("Rebounding advantage");
    }

    if (home.to > opp.to) {
        insights.push("Too many turnovers");
    }

    if (home.ast > opp.ast) {
        insights.push("Sharing is caring! Team ball movement was great");
    }

    if (insights.length == 0) {
        $('#insights-box').html("No insights for this game");
    } else {
        $('#insights-box').html(insights.join('<br>'));
    }
}
