const API = '';
let gameId = null;
let homePlayers = [];
let opponentPlayers = [];
let gameData = null;
let allStats = [];
let clockInterval = null;
let clockSeconds = 600; // 10 min quarters
let isRunning = false;
let debouncing = {};
let quarter = null;

// ===================== SETUP PAGE =====================

$(document).ready(function () {

    if ($('#setup-page').length) {
        loadHomePlayers();
        addOpponentRow();
        addOpponentRow();
        addOpponentRow();
        addOpponentRow();
        addOpponentRow();

        $('#add-opp-player').click(addOpponentRow);
        $('#start-game-btn').click(startGame);
        
    }

    if ($('#game-page').length) {
        const params = new URLSearchParams(window.location.search);
        gameId = params.get('gameId');

        if (!gameId) {
            alert('No game selected!');
            return;
        }

        fetchGameDetails(); 
    }


    // Keyboard shortcuts
    $(document).keydown(function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undoLast();
        }
    });
});

function loadHomePlayers() {
    $.get(`${API}/api/players/active`, function (res) {
        players = res.players || [];
        homePlayers = players;

        let html = '<table class="table table-sm table-dark mb-0"><thead><tr><th>#</th><th>Name</th><th>Pos</th></tr></thead><tbody>';
        players.forEach(p => {
            html += `<tr><td class="font-mono fw-bold">${p.jerseyNumber}</td><td>${p.firstName} ${p.lastName}</td><td><span class="badge bg-secondary">${p.position}</span></td></tr>`;
        });
        html += '</tbody></table>';
        $('#home-roster-preview').html(html);
    }).fail(function () {
        $('#home-roster-preview').html('<div class="text-warning">⚠ Could not load players. Make sure players exist in the database.</div>');
    });
}

function addOpponentRow() {
    const idx = $('.opp-player-entry').length;
    const html = `
        <div class="opp-player-entry d-flex gap-2 align-items-center">
            <input type="number" class="form-control form-control-sm bg-light border-secondary text-dark opp-jersey" 
                   placeholder="#" style="width:70px" min="0" max="99">
            <input type="text" class="form-control form-control-sm bg-light border-secondary text-dark opp-name" 
                   placeholder="Full Name" required>
            <select class="form-select form-select-sm bg-light border-secondary text-dark opp-pos" style="width:80px">
                <option value="">Pos</option>
                <option>PG</option><option>SG</option><option>SF</option><option>PF</option><option>C</option>
            </select>
            <button class="btn btn-outline-danger btn-sm remove-opp-row" type="button">✕</button>
        </div>`;
    $('#opp-players-list').append(html);
    updatePlayerCount();
}

$(document).on('click', '.remove-opp-row', function () {
    if ($('.opp-player-entry').length > 5) {
        $(this).closest('.opp-player-entry').remove();
        updatePlayerCount();
    }
});

$(document).on('input', '.opp-jersey, .opp-name', function () {
    updatePlayerCount();
});

function updatePlayerCount() {
    const filled = getOpponentPlayersFromForm().filter(p => p.fullName && p.jerseyNumber !== '');
    $('#player-count').text(filled.length);
    $('#start-game-btn').prop('disabled', filled.length < 5 || !$('#opponent-name').val().trim());
}

$('#opponent-name').on('input', updatePlayerCount);

function getOpponentPlayersFromForm() {
    const players = [];
    $('.opp-player-entry').each(function () {
        players.push({
            jerseyNumber: parseInt($(this).find('.opp-jersey').val()) || 0,
            fullName: $(this).find('.opp-name').val().trim(),
            position: $(this).find('.opp-pos').val() || ''
        });
    });
    return players;
}

function startGame() {
    const opponent = $('#opponent-name').val().trim();
    const venue = $('#game-venue').val().trim() || 'TBD';
    const oppPlayers = getOpponentPlayersFromForm().filter(p => p.fullName && p.jerseyNumber);
    const tournament = $('#tournament').val().trim() || '';

    if (oppPlayers.length < 5) {
        $('#setup-error').removeClass('d-none').text('At least 5 opponent players with name and jersey number required.');
        return;
    }

    // Check unique jerseys
    const jerseys = oppPlayers.map(p => p.jerseyNumber);
    if (new Set(jerseys).size !== jerseys.length) {
        $('#setup-error').removeClass('d-none').text('Opponent jersey numbers must be unique.');
        return;
    }

    $('#start-game-btn').prop('disabled', true).text('Creating game...');

    $.ajax({
        url: `${API}/api/games/create`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ opponent, tournament, opponentPlayers: oppPlayers, venue, gameDate: new Date() }),
        success: function (res) {
            game = res.data;
            gameId = game._id;
            // gameData = game;
            // opponentPlayers = game.opponentPlayers;
            window.location.href = `/admin/encode-stats?gameId=${game._id}`
        },
        error: function (xhr) {
            const msg = xhr.responseJSON?.error || 'Failed to create game';
            $('#setup-error').removeClass('d-none').text(msg);
            $('#start-game-btn').prop('disabled', false).text('START GAME →');
        }
    });
}

// get game details for the stat input page
async function fetchGameDetails() {
    try {
        const gameRes = await $.get(`${API}/api/games/${gameId}`);
        const playerRes = await $.get(`${API}/api/players/active`);

        // Handle both {game: {}} and direct {} responses
        gameData = gameRes.game || gameRes;
        opponentPlayers = gameData.opponentPlayers || [];
        homePlayers = playerRes.players || [];
        
        // Sync clock
        const syncedSeconds = mmssToSeconds(gameData.gameClock);
        if (!isNaN(syncedSeconds)) {
            clockSeconds = syncedSeconds;
        }

        initGameUI();
        updateControls();
    } catch (err) {
        console.error("Failed to fetch game details:", err);
    }
}

// ===================== GAME UI =====================

function initGameUI() {
    $('#hdr-home-name').text('LA SALLE');
    $('#hdr-opp-name').text(gameData.opponent.toUpperCase());
    $('#opp-panel-name').text(gameData.opponent.toUpperCase());

    renderHomePlayers();
    renderOpponentPlayers();
    loadStats();
    loadEvents();
    updateScoreboard();
}

function renderHomePlayers() {
    let html = '';
    homePlayers.forEach((p, i) => {
        const isOnCourt = i < 5;
        html += playerRowHTML(p._id, p.jerseyNumber, `${p.firstName} ${p.lastName}`, p.position, 'lasalle', isOnCourt, p.profilePhoto);
    });
    $('#home-players-panel').html(html);
    
}

function renderOpponentPlayers() {
    let html = '';
    opponentPlayers.forEach((p, i) => {
        const isOnCourt = i < 5;
        html += playerRowHTML(null, p.jerseyNumber, p.fullName, p.position || '', 'opponent', isOnCourt, null);
    });
    $('#opp-players-panel').html(html);

}

function playerRowHTML(playerId, jersey, name, position, team, onCourt, photo) {
    const courtClass = onCourt ? (team === 'lasalle' ? 'on-court' : 'on-court-opp') : '';
    const dataId = playerId ? `data-player-id="${playerId}"` : '';
    const dataJersey = `data-jersey="${jersey}"`;
    const dataName = `data-name="${name}"`;
    const dataTeam = `data-team="${team}"`;
    const avatarSrc = photo && photo !== '/uploads/players/default.png' ? photo : '';
    const avatarHTML = avatarSrc ? `<img src="${avatarSrc}" class="rounded-circle me-1" width="24" height="24">` : '';

    return `
    <div class="player-row ${courtClass}" ${dataId} ${dataJersey} ${dataName} ${dataTeam} data-oncourt="${onCourt}">
        <div class="d-flex justify-content-between align-items-center mb-1">
            <div class="d-flex align-items-center gap-1">
                ${avatarHTML}
                <span class="fw-bold font-mono ${team === 'lasalle' ? 'text-success' : 'text-danger'}">#${jersey}</span>
                <span class="fw-600 small text-white">${name}</span>
                ${position ? `<span class="badge bg-secondary" style="font-size:9px">${position}</span>` : ''}
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="fw-bold text-white font-mono player-pts" data-key="${team}-${jersey}-pts">0<span class="text-white ms-1" style="font-size:9px">PTS</span></span>
                <span class="font-mono text-white player-fouls" data-key="${team}-${jersey}-fouls" style="font-size:10px">0F</span>
                <button class="sub-btn">SUB</button>
            </div>
        </div>
        <div class="q-stat mb-1">
            <span data-key="${team}-${jersey}-fg">0/0</span> FG &nbsp;
            <span data-key="${team}-${jersey}-3pt">0/0</span> 3PT &nbsp;
            <span data-key="${team}-${jersey}-ft">0/0</span> FT &nbsp;
            <span data-key="${team}-${jersey}-reb">0</span> REB &nbsp;
            <span data-key="${team}-${jersey}-ast">0</span> AST
        </div>
        <div class="d-flex gap-1 flex-wrap">
            <button class="stat-btn score" onclick="recordStat(this,'shot made','2PT')">+2PT</button>
            <button class="stat-btn score" onclick="recordStat(this,'shot made','3PT')">+3PT</button>
            <button class="stat-btn score" onclick="recordStat(this,'free throw made','FT')">FT✓</button>
            <button class="stat-btn negative" onclick="recordStat(this,'free throw missed','FT')">FT✗</button>
            <button class="stat-btn" onclick="recordStat(this,'shot missed','2PT')">2PT✗</button>
            <button class="stat-btn" onclick="recordStat(this,'shot missed','3PT')">3PT✗</button>
            <button class="stat-btn" onclick="recordStat(this,'offensive rebound')">OREB</button>
            <button class="stat-btn" onclick="recordStat(this,'defensive rebound')">DREB</button>
            <button class="stat-btn assist" onclick="recordStat(this,'assist')">AST</button>
            <button class="stat-btn assist" onclick="recordStat(this,'steal')">STL</button>
            <button class="stat-btn assist" onclick="recordStat(this,'block')">BLK</button>
            <button class="stat-btn negative" onclick="recordStat(this,'turnover')">TO</button>
            <button class="stat-btn negative" onclick="recordStat(this,'foul')">FOUL</button>
        </div>
    </div>`;
}



function updateControls() {
    const period = gameData?.currentPeriod || 0;
    const status = gameData?.status || 'PLAYING';

    if (status == 'ENDED') {
        $('#game-controls').html('<span class="badge bg-danger">FINAL</span>');
        $('#hdr-clock').text("00:00")
        $('.stat-btn').prop('disabled', true);
        $('.stat-btn').prop('disabled', true);
        $('.sub-btn').prop('disabled', true);
        // $('#ctrl-end').prop('disabled', true);
        // $('#ctrl-next-q').prop('disabled', true);
        // $('#ctrl-ot').prop('disabled', true);
        // $('#ctrl-start').prop('disabled', true);
        // $('#ctrl-pause').prop('disabled', true);
        // $('#ctrl-resume').prop('disabled', true);
        $('#undo-btn').prop('disabled', true);
    }
    
    if (period != 0) quarter = period;

    // ===== STAT BUTTONS =====
    let isOnCourt;
    $('.stat-btn').prop('disabled', !isRunning);

    // Disable stat recording for players not on court
    $('.player-row').each(function () {
        isOnCourt = $(this).data('oncourt');

        if (isOnCourt == false) {
            $(this).find('.stat-btn').prop('disabled', !isOnCourt);
        }
    });

    // ===== SUB BUTTONS =====
    $('.sub-btn').off('click'); // remove old handlers


    // ===== GAME CONTROL BUTTONS =====
    $('#ctrl-end').prop('disabled', isRunning);

    // disable next quarter and OT buttons when clock is running or the time for a quarter is not done yet
    if(clockSeconds != 0 || isRunning){
        $('#ctrl-next-q').prop('disabled', true);
        $('#ctrl-ot').prop('disabled', true);
    } else {
        $('#ctrl-next-q').prop('disabled', false);
        $('#ctrl-ot').prop('disabled', false);
    }


    if (quarter >= 4) {
        $('#ctrl-ot').removeClass('d-none');
        $('#ctrl-next-q').addClass('d-none');
    } 
    
    if (quarter < 4) {
        $('#ctrl-next-q').removeClass('d-none');
        $('#ctrl-ot').addClass('d-none');
    }  
    

    if (!isRunning) {
        const isFirstQuarter = period === 1;
        const isequal10Min = clockSeconds === 600;

        if (isFirstQuarter && isequal10Min) {
            // Q1 under 10 min - ONLY toggle
            $('.sub-btn').on('click', function () {
                toggleOnCourt(this);
            });
        } else {
            // Other cases - toggle + record stat
            $('.sub-btn').on('click', function () {
                toggleOnCourt(this);
                recordStat(this, 'substitution');
            });
        }
    }
    
}

window.toggleOnCourt = function (btn) {
    const row = $(btn).closest('.player-row');
    const isOn = row.data('oncourt');
    row.data('oncourt', !isOn);

    const team = row.data('team');

    if (!isOn) {
        row.addClass(team === 'lasalle' ? 'on-court' : 'on-court-opp');
    } else {
        row.removeClass('on-court on-court-opp');
    }

}

// ===================== STAT RECORDING =====================

window.recordStat = function (btn, eventType, shotType) {
    const row = $(btn).closest('.player-row');
    const team = row.data('team');
    const jersey = row.data('jersey');
    const name = row.data('name');
    const playerId = row.data('player-id');

    // Debounce
    const key = `${team}-${jersey}-${eventType}-${shotType || ''}`;
    if (debouncing[key]) return;
    debouncing[key] = true;
    $(btn).addClass('cooldown');
    setTimeout(() => { debouncing[key] = false; $(btn).removeClass('cooldown'); }, 400);

    const payload = {
        team,
        eventType,
        shotType: shotType || '',
        gameClock: formatClock(clockSeconds)
    };

    if (team === 'lasalle') {
        payload.playerId = playerId;
    } else {
        payload.opponentPlayer = { jerseyNumber: jersey, fullName: name };
    }

    $.ajax({
        url: `${API}/api/games/${gameId}/events`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (res) {
            gameData = res.game;
            allStats = res.stats;
            updateScoreboard();
            updateAllPlayerStats();
            renderEvents(res.events);
        },
        error: function (xhr) {
            console.error('Event error:', xhr.responseJSON);
        }
    });
}

function undoLast() {
    if (!gameId) return;
    $.ajax({
        url: `${API}/api/games/${gameId}/undo`,
        method: 'POST',
        success: function (res) {
            gameData = res.game;
            allStats = res.stats;
            updateScoreboard();
            updateAllPlayerStats();
            renderEvents(res.events);
        }
    });
}

$('#undo-btn').click(undoLast);

// ===================== UI UPDATES =====================

function updateScoreboard() {
    if (!gameData) return;
    $('#hdr-home-score').text(gameData.teamScore || 0);
    $('#hdr-opp-score').text(gameData.opponentScore || 0);
    $('#hdr-period').text(periodLabel(gameData.currentPeriod || 1));
    $('#home-total-pts').text((gameData.teamScore || 0) + ' PTS');
    $('#opp-total-pts').text((gameData.opponentScore || 0) + ' PTS');
}

function periodLabel(p) {
    if (p <= 4) return 'Q' + p;
    return 'OT' + (p - 4);
}

function updateAllPlayerStats() {
    // Reset display
    const homeAgg = { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, fouls: 0 };
    const oppAgg = { ...homeAgg };

    allStats.forEach(s => {
        const t = s.totals || {};
        const team = s.team;
        const jersey = team === 'lasalle' ? (s.playerId?.jerseyNumber || 0) : s.opponentPlayerIndex;
        const prefix = `${team}-${jersey}`;

        $(`[data-key="${prefix}-pts"]`).html(`${t.points || 0}<span class="text-white ms-1" style="font-size:9px">PTS</span>`);
        $(`[data-key="${prefix}-fouls"]`).text(`${t.fouls || 0}F`);
        $(`[data-key="${prefix}-fg"]`).text(`${t.fieldGoalsMade || 0}/${t.fieldGoalsAttempted || 0}`);
        $(`[data-key="${prefix}-3pt"]`).text(`${t.threePointersMade || 0}/${t.threePointersAttempted || 0}`);
        $(`[data-key="${prefix}-ft"]`).text(`${t.freeThrowsMade || 0}/${t.freeThrowsAttempted || 0}`);
        $(`[data-key="${prefix}-reb"]`).text((t.offensiveRebounds || 0) + (t.defensiveRebounds || 0));
        $(`[data-key="${prefix}-ast"]`).text(t.assists || 0);

        // Foul warning
        const row = $(`[data-jersey="${jersey}"][data-team="${team}"]`);
        if ((t.fouls || 0) >= 5) row.addClass('foul-warning');
        else row.removeClass('foul-warning');

        // Aggregate
        const agg = team === 'lasalle' ? homeAgg : oppAgg;
        agg.pts += t.points || 0;
        agg.fgm += t.fieldGoalsMade || 0; agg.fga += t.fieldGoalsAttempted || 0;
        agg.tpm += t.threePointersMade || 0; agg.tpa += t.threePointersAttempted || 0;
        agg.ftm += t.freeThrowsMade || 0; agg.fta += t.freeThrowsAttempted || 0;
        agg.oreb += t.offensiveRebounds || 0; agg.dreb += t.defensiveRebounds || 0;
        agg.ast += t.assists || 0; agg.stl += t.steals || 0; agg.blk += t.blocks || 0;
        agg.to += t.turnovers || 0; agg.fouls += t.fouls || 0;
    });

    renderTeamStats('#home-team-stats', homeAgg);
    renderTeamStats('#opp-team-stats', oppAgg);
}

function renderTeamStats(selector, a) {
    const pct = (m, att) => att === 0 ? '0.0' : ((m / att) * 100).toFixed(1);
    const fgm = a.fgm + a.tpm;
    const fga = a.fga + a.tpa;
    const stats = [
        { lbl: 'FG%', val: pct(fgm, fga) + '%', sub: `${fgm}/${fga}` },
        { lbl: '3PT%', val: pct(a.tpm, a.tpa) + '%', sub: `${a.tpm}/${a.tpa}` },
        { lbl: 'FT%', val: pct(a.ftm, a.fta) + '%', sub: `${a.ftm}/${a.fta}` },
        { lbl: 'REB', val: a.oreb + a.dreb, sub: `${a.oreb}O/${a.dreb}D` },
        { lbl: 'AST', val: a.ast },
        { lbl: 'STL', val: a.stl },
        { lbl: 'BLK', val: a.blk },
        { lbl: 'TO', val: a.to },
        { lbl: 'PF', val: a.fouls }
    ];
    let html = '';
    stats.forEach(s => {
        html += `<div class="col"><div class="team-stat-box"><div class="stat-val">${s.val}</div><div class="stat-lbl">${s.lbl}</div>${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}</div></div>`;
    });
    $(selector).html(html);
}

function renderEvents(events) {
    let html = '';
    if (!events || events.length === 0) {
        html = '<div class="text-white text-center py-4 small">No events yet</div>';
    } else {
        events.forEach(e => {
            const fullName = e.playerId?.firstName + " " + e.playerId?.lastName;
            const isHome = e.team === 'lasalle';
            const jersey = isHome ? (e.playerId?.jerseyNumber || '?') : e.opponentPlayer?.jerseyNumber || '?';
            const name = isHome ? (fullName || 'Unknown') : (e.opponentPlayer?.fullName || 'Unknown');
            const teamTag = isHome ? '' : ' (OPP)';
            let colorClass = 'pbp-neutral';
            if (['shot made', 'free throw made'].includes(e.eventType)) colorClass = 'pbp-score';
            if (['turnover', 'foul', 'shot missed', 'free throw missed'].includes(e.eventType)) colorClass = 'pbp-negative';

            let desc = e.eventType;
            if (e.shotType && e.shotType !== 'FT') desc += ` (${e.shotType})`;

            html += `<div class="pbp-entry">
                <span class="pbp-time">${e.gameClock || '--:--'}</span>
                <span class="badge ${isHome ? 'bg-success' : 'bg-danger'} me-1" style="font-size:9px">Q${e.period}</span>
                <strong class="${isHome ? 'text-success' : 'text-danger'}">#${jersey}</strong>
                <span class="pbp-time">${name}${teamTag}</span>
                <span class="${colorClass}">${desc}</span>
                ${e.points > 0 ? `<span class="pbp-score float-end fw-bold">+${e.points}</span>` : ''}
            </div>`;
        });
    }
    $('#pbp-feed').html(html);
}

function loadStats() {
    $.get(`${API}/api/games/${gameId}/stats`, function (res) {
        if (!res.stats || !Array.isArray(res.stats)) return;

        allStats = res.stats 
        updateAllPlayerStats();
    });
}

function loadEvents() {
    $.get(`${API}/api/games/${gameId}/events`, function (res) {
        renderEvents(res.events);
    });
}


// ===================== HELPERS =====================

// helper to convert string time to number
function mmssToSeconds(str) {
    // 1. Force to string and trim whitespace
    if (typeof str !== 'string') {
        console.error("Input is not a string:", str);
        return NaN;
    }
    
    const cleanStr = str.trim();
    if (!cleanStr) return NaN;

    // 2. Split and clean each individual part
    const parts = cleanStr.split(':').map(p => p.trim());
    
    if (parts.length !== 2) {
        console.error("String does not match MM:SS format:", cleanStr);
        return NaN;
    }

    // 3. Parse using parseFloat to handle potential decimals (like 12.5s)
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);

    if (isNaN(minutes) || isNaN(seconds)) {
        return NaN;
    }

    // 4. Final calculation (using Math.floor if you want whole seconds)
    return Math.floor((minutes * 60) + seconds);
}


function formatClock(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateClockDisplay() {
    $('#hdr-clock').text(formatClock(clockSeconds));
}


// ===================== CLOCK CONTROL =====================

function startClock() {
    if (clockInterval) return;
    isRunning = true;
    updateControls();
    clockInterval = setInterval(() => {
        if (clockSeconds > 0) {
            clockSeconds--;
            updateClockDisplay();
        } else {
            stopClock();
        }
    }, 1000);
}

function stopClock() {
    isRunning = false;
    updateControls();
    if (clockInterval) { 
        clearInterval(clockInterval); 
        clockInterval = null; 
    }
}

// Game controls
$('#ctrl-start').click(function () {
    $.ajax({ 
        url: `${API}/api/games/${gameId}`,
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ status: 'PLAYING' }),
        success: function (res) {
            gameData = res.game;
            startClock();
            $('#ctrl-start').addClass('d-none');
            $('#ctrl-pause').removeClass('d-none');
        }
    });
});

$('#ctrl-pause').click(function () {
    $.ajax({ 
        url: `${API}/api/games/${gameId}`, 
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ status: 'PAUSED' }),
        success: function (res) {
            gameData = res.game;
            stopClock();
            $('#ctrl-pause').addClass('d-none');
            $('#ctrl-resume').removeClass('d-none');
        }
    });
});

$('#ctrl-resume').click(function () {
    $.ajax({ 
        url: `${API}/api/games/${gameId}`, 
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ status: 'PLAYING' }),
        success: function (res) {
            gameData = res.game;
            startClock();
            $('#ctrl-resume').addClass('d-none');
            $('#ctrl-pause').removeClass('d-none');
        }
    });
});

$('#ctrl-next-q').click(function () {
    stopClock();
    const nextPeriod = (gameData.currentPeriod || 1) + 1;
    if (nextPeriod > 4 + (gameData.quarterScores?.overtimes?.length || 0)) return;
    clockSeconds = nextPeriod <= 4 ? 600 : 300;
    updateClockDisplay();

    $.ajax({ 
        url: `${API}/api/games/${gameId}`, 
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ 
            currentPeriod: nextPeriod, 
            gameClock: formatClock(clockSeconds), 
            status: 'PAUSED' 
        }),
        success: function (res) {
            gameData = res.game;
            updateScoreboard();
            $('#ctrl-pause').addClass('d-none');
            $('#ctrl-resume').removeClass('d-none');
        }
    });
    //updateControls();
});

$('#ctrl-ot').click(function () {
    stopClock();
    $.ajax({ 
        url: `${API}/api/games/${gameId}/overtime`, 
        method: 'POST',
        success: function (res) {
            gameData = res.game;
            clockSeconds = 300;
            updateClockDisplay();
            updateScoreboard();
            $('#ctrl-pause').addClass('d-none');
            $('#ctrl-resume').removeClass('d-none');
        }
    });
});

$('#ctrl-end').click(function () {
    if (!confirm('End the game?')) return;
    stopClock();
    $.ajax({ 
        url: `${API}/api/games/${gameId}`, 
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ status: 'ENDED' }),
        success: function (res) {
            gameData = res.game;
            $('#game-controls').html('<span class="badge bg-danger">FINAL</span>');
        }
    });
});

// Sync clock to server periodically
let isSyncing = false;
setInterval(async function () {
    if (gameId && isRunning && !isSyncing) {
        isSyncing = true;
        try {
            await $.ajax({ 
                url: `${API}/api/games/${gameId}`, 
                method: 'PATCH', 
                contentType: 'application/json',
                data: JSON.stringify({ gameClock: formatClock(clockSeconds) })
            });
        } finally {
            isSyncing = false;
        }
    }
}, 15000);