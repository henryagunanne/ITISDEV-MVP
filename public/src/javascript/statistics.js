const API = '';

let selectedGameId = null;

// Load games into dropdown
$(document).ready(function () {
    loadGames();

    $('#game-select').change(function () {
        selectedGameId = $(this).val();
        if (selectedGameId) {
            loadStats(selectedGameId);
        }
    });
});

function loadGames() {
    $.get(`${API}/api/games/all-games`, function (res) {
        const games = res.data || [];
        console.log(games)
        let html = `<option value="">Select Game</option>`;
        games.forEach(g => {
            html += `<option value="${g._id}">
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

function renderTable(stats) {
    let html = '';

    stats.forEach(s => {
        if (s.team !== 'lasalle') return;

        const t = s.totals || {};

        html += `
        <tr>
            <td>${s.playerId?.jerseyNumber || '-'}</td>
            <td>${s.playerId?.fullName || 'Unknown'}</td>
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

        target.pts += t.points || 0;
        target.fgm += t.fieldGoalsMade || 0;
        target.fga += t.fieldGoalsAttempted || 0;
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
}