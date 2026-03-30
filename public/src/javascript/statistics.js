/* 
    Handles the interactiviy, logic and frontend requests of the statistics viewing page
*/

const API = '';

let selectedGameId = null;
let stat;
let teamChart, shootingChart;

// Load games into dropdown
$(document).ready(function () {
    loadGames();

    $('#game-select').change(function () {
        selectedGameId = $(this).val();
        stat = $(this).find(':selected').data('status');
        if (selectedGameId) {
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
        
        console.log("INSIGHTS RESPONSE:", res); // DEBUG

        const data = res.insights;

        if (!data) {
            $('#insights-box').html("No insights available");
            return;
        }

        $('#insights-box').html(data.replace(/\n/g, "<br>"));

    }).fail(function (err) {
        console.error("Insights error:", err);
        $('#insights-box').html("Failed to load insights");
    });
}

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
    const home = { pts: 0, fgm: 0, fga: 0, reb: 0, ast: 0 };
    const opp = { pts: 0, fgm: 0, fga: 0, reb: 0, ast: 0 };

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

    // TEAM COMPARISON
    teamChart = new Chart(document.getElementById('teamChart'), {
        type: 'bar',
        data: {
            labels: ['PTS', 'REB', 'AST'],
            datasets: [
                {
                    label: 'La Salle',
                    data: [home.pts, home.reb, home.ast]
                },
                {
                    label: 'Opponent',
                    data: [opp.pts, opp.reb, opp.ast]
                }
            ]
        }
    });

    // SHOOTING %
    shootingChart = new Chart(document.getElementById('shootingChart'), {
        type: 'radar',
        data: {
            labels: ['FG%', '3PT%', 'FT%'],
            datasets: [{
                label: 'La Salle',
                data: [
                    pct(home.fgm, home.fga),
                    pct(home.tpm, home.tpa),
                    pct(home.ftm, home.fta)
                ]
            }]
        }
    });
}


// defunct**
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
