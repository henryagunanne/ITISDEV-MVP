/* Handles the interactivity logic of the live game statistics input module
*/

const API = '';
let gameId = null;
let homePlayers = [];
let opponentPlayers = [];
let gameData = null;
let allStats = [];
let clockInterval = null;
let clockSeconds = 600; // 10 min quarters
// Game Clock States
let isRunning = false;
let isMasterClock = false;
let lastClockTick = Date.now();

let debouncing = {};
let quarter = null;

// Initialize Socket connection
let socket;
//const socket = io();


$(document).ready(function () {

    // IF IT IS THE GAME SETUP PAGE
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

    // IF IT IS THE LIVE GAME INPUT PAGE
    if ($('#game-page').length) {
        socket = io(); // Initialize the socket connection when on the game page

        setupSocketListeners(); // Bind all the listeners

        const params = new URLSearchParams(window.location.search);
        gameId = params.get('gameId');

        if (!gameId) {
            alert('No game selected!');
            return;
        }

        // Tell the server to join this specific game's room
        socket.emit('join_game', gameId);

        fetchGameDetails(); 
        
        // Drag and drop players to sub
        new Sortable(document.getElementById('home-players-panel'), {
            animation: 150,
            onEnd: function () { 
                // Sync the new visual order to everyone else when drag ends
                broadcastPanelOrder('home-players-panel');
                
                // syncOnCourtFromOrder('#home-players-panel'); 
            }
        });
        
        new Sortable(document.getElementById('opp-players-panel'), {
            animation: 150,
            onEnd: function () { 
                // Sync the new visual order to everyone else when drag ends
                broadcastPanelOrder('opp-players-panel');

                // syncOnCourtFromOrder('#opp-players-panel'); 
            }
        });
    }


    // Keyboard shortcuts
    $(document).keydown(function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undoLast();
        }
    });
});


// Helper function to broadcast the current visual DOM order of a panel
function broadcastPanelOrder(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    // Grab the 'id' attribute of every child element inside the panel
    const currentOrder = Array.from(panel.children)
        .map(el => el.id)
        .filter(id => id); // Filter out elements without an ID

    // Emit the new layout to other viewers
    socket.emit('sync_ui_layout', {
        gameId: gameId,
        panelId: panelId,
        order: currentOrder
    });
}



function loadHomePlayers() {
    $.get(`${API}/api/players/active`, function (res) {
        players = res.players || [];
        homePlayers = players;

        // Build a selectable list with checkboxes
        let html = '<div class="list-group">';
        players.forEach(p => {
            html += `
                <label class="list-group-item d-flex justify-content-between align-items-center text-white bg-dark border-secondary" style="cursor: pointer;">
                    <div>
                        <input class="form-check-input me-2 home-player-checkbox" type="checkbox" value="${p._id}" checked>
                        <span class="fw-bold">#${p.jerseyNumber}</span> ${p.firstName} ${p.lastName}
                    </div>
                    <span class="badge bg-success rounded-pill">${p.position}</span>
                </label>
            `;
        });
        html += '</div>';

        $('#home-roster-preview').html(html);
    }).fail(function () {
       $('#home-roster-preview').html('<div class="text-danger">Failed to load home roster.</div>');
    });
}

function addOpponentRow() {
    const idx = $('.opp-player-entry').length;
    const html = `
        <div class="opp-player-entry d-flex gap-2 align-items-center">
        <input type="text" 
                    inputmode="numeric" 
                    pattern="[0-9]{1,2}" 
                    maxlength="2"
                    class="form-control form-control-sm bg-light border-secondary text-dark opp-jersey" 
                    placeholder="#" 
                    style="width:70px">
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

    // collect the selected home players
    const selectedHomePlayers = [];
    $('.home-player-checkbox:checked').each(function() {
        selectedHomePlayers.push($(this).val());
    });

    if (selectedHomePlayers.length < 5) {
        $('#setup-error').text('Please select at least 5 Home players.').removeClass('d-none');
        return;
    }

    const payload = {
        opponent,
        tournament,
        opponentPlayers: oppPlayers,
        players: selectedHomePlayers,
        venue,
        gameDate: new Date()
    };

    $('#start-game-btn').prop('disabled', true).text('Creating game...');

    $.ajax({
        url: `${API}/api/games/create`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
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
        const playerRes = await $.get(`${API}/api/games/${gameId}/roster`);

        // Handle both {game: {}} and direct {} responses
        gameData = gameRes.game || gameRes;
        opponentPlayers = playerRes.awayPlayers || [];
        homePlayers = playerRes.homePlayers || [];
        
        // Sync clock
        const syncedSeconds = mmssToSeconds(gameData.gameClock);
        if (!isNaN(syncedSeconds)) {
            clockSeconds = syncedSeconds;
        }

        initGameUI();
        updateControls();

        // Ask other open connections for the current UI layout!
        socket.emit('request_ui_sync', gameId);
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
        html += playerRowHTML(p.playerId, p.jerseyNumber, `${p.firstName} ${p.lastName}`, p.position, 'lasalle', p.isOnCourt || isOnCourt, p.profilePhoto);
    });
    $('#home-players-panel').html(html);
    
}

function renderOpponentPlayers() {
    let html = '';
    opponentPlayers.forEach((p, i) => {
        const isOnCourt = i < 5;
        html += playerRowHTML(null, p.jerseyNumber, p.fullName, p.position || '', 'opponent', p.isOnCourt || isOnCourt, null);
    });
    $('#opp-players-panel').html(html);

}

function playerRowHTML(playerId, jersey, name, position, team, onCourt, photo) {
    const courtClass = onCourt ? (team === 'lasalle' ? 'on-court' : 'on-court-opp') : '';
    const dataId = playerId ? `data-player-id="${playerId}"` : '';
    const dataJersey = `data-jersey="${jersey}"`;
    const dataName = `data-name="${name}"`;
    const dataTeam = `data-team="${team}"`;
    const rowId = team === 'lasalle' ? `player-${playerId}` : `opp-player-${jersey}`;
    const avatarSrc = photo && photo !== '/uploads/players/default.png' ? photo : '';
    const avatarHTML = avatarSrc ? `<img src="${avatarSrc}" class="rounded-circle me-1" width="24" height="24">` : '';

    return `
    <div id="${rowId}" class="player-row ${courtClass}" ${dataId} ${dataJersey} ${dataName} ${dataTeam} data-oncourt="${onCourt}">
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
            <button class="stat-btn score" data-event="2PT shot made" onclick="recordStat(this,'shot made','2PT')">+2PT</button>
            <button class="stat-btn score" data-event="3PT shot made" onclick="recordStat(this,'shot made','3PT')">+3PT</button>
            <button class="stat-btn score ft-btn" data-event="free throw made" onclick="recordStat(this,'free throw made','FT')">FT✓</button>
            <button class="stat-btn negative ft-btn" data-event="free throw missed" onclick="recordStat(this,'free throw missed','FT')">FT✗</button>
            <button class="stat-btn" data-event="2PT shot missed" onclick="recordStat(this,'shot missed','2PT')">2PT✗</button>
            <button class="stat-btn" data-event="3PT shot missed" onclick="recordStat(this,'shot missed','3PT')">3PT✗</button>
            <button class="stat-btn" data-event="offensive rebound" onclick="recordStat(this,'offensive rebound')">OREB</button>
            <button class="stat-btn" data-event="defensive rebound" onclick="recordStat(this,'defensive rebound')">DREB</button>
            <button class="stat-btn assist" data-event="assist" onclick="recordStat(this,'assist')">AST</button>
            <button class="stat-btn assist" data-event="steal" onclick="recordStat(this,'steal')">STL</button>
            <button class="stat-btn assist" data-event="block" onclick="recordStat(this,'block')">BLK</button>
            <button class="stat-btn negative" data-event="turnover" onclick="recordStat(this,'turnover')">TO</button>
            <button class="stat-btn negative foul" data-event="foul">FOUL</button>
        </div>
    </div>`;
}



// Not in use at the moment
function syncOnCourtFromOrder(selector) {
    const rows = $(selector).find('.player-row');

    rows.each(function (index) {
        const isStarter = index < 5;
        const team = $(this).data('team');
        // const subBtn = $(this).find('.sub-btn');

        $(this).data('oncourt', isStarter);

        if (isStarter) {
            $(this).addClass(team === 'lasalle' ? 'on-court' : 'on-court-opp');
        } else {
            $(this).removeClass('on-court on-court-opp');
        }

        // recordStat(subBtn, 'substitution');
    });

}


// Enable or disable buttons based on game state
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
    // Normal stats (2pt, 3pt, reb, etc.) are only active when clock is running
    $('.stat-btn').not('.ft-btn').prop('disabled', !isRunning);

    // Free Throws MUST always lock when the clock is running.
    // (If the clock is paused, we leave them alone so your Foul Socket listener can unlock them)
    const fullPeriodSeconds = period > 4 ? 300 : 600;
    if (isRunning || clockSeconds === 0 || clockSeconds === fullPeriodSeconds) {
        $('.ft-btn').prop('disabled', true).addClass('disabled');
    }

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

        // Ensure the clock controls are unlocked while the quarter is active
        $('#ctrl-start, #ctrl-resume, #ctrl-pause').prop('disabled', false);
    } else {
        $('#ctrl-next-q').prop('disabled', false);
        $('#ctrl-ot').prop('disabled', false);

        // The clock is at zero. Lock all start/resume/pause buttons!
        $('#ctrl-start, #ctrl-resume, #ctrl-pause').prop('disabled', true);
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
        $('.sub-btn').on('click', function () {
            toggleOnCourt(this);

            // broadcast the changes just made
            broadcastPanelOrder('home-players-panel');
            broadcastPanelOrder('opp-players-panel');
        });
    }

    // handle foul button clicks
    $('.stat-btn[data-event="foul"]').off('click').on('click', function () {
        const btn = $(this);
        // const playerRow = btn.closest('.player-row');

        const now = Date.now();
        const lastClick = debouncing[btn[0]] || 0;
        // If less than 500 milliseconds (half a second) has passed since the last click...
        if (now - lastClick < 500) return; // ...ignore this click and stop here!
        
        // Otherwise, record the exact time of this valid click
        debouncing[btn[0]] = now;

        const event = btn.data('event');

        // --- FOUL & FREE THROW LOGIC ---
        if (event === 'foul') {
            // Pause the clock if it's currently running
            if (isRunning) {
                $('#ctrl-pause').click(); 
            }
            
            // Tell the SERVER to broadcast the foul state so Free Throw buttons unlock
            socket.emit('cmd_unlock_ft', gameId);
        }

        recordStat(this, event);
    });
    
}

// Helper to move player row up or down when substitution is made
function reorderPlayers(container) {
    const rows = container.find('.player-row');

    const onCourt = [];
    const bench = [];

    rows.each(function () {
        if ($(this).data('oncourt')) onCourt.push(this);
        else bench.push(this);
    });


    // Add starters first
    onCourt.forEach(r => container.append(r));

    // Then bench
    bench.forEach(r => container.append(r));
}


// Helper to Limit player on court to 5
function getOnCourtCount(container) {
    return container.find('.player-row').filter(function () {
        return $(this).data('oncourt') === true;
    }).length;
}


// Function to toggle substitution
window.toggleOnCourt = function (btn, broadcast = true) {
    const row = $(btn).closest('.player-row');
    const container = row.parent();
    const isOn = row.data('oncourt');
    const team = row.data('team');

    // Identify the row uniquely across all browsers
    const rowId = row.attr('id');

    const onCourtCount = getOnCourtCount(container);

    // Prevent more than 5 players
    if (broadcast && !isOn && onCourtCount >= 5) {
        alert("Only 5 players allowed on the court!");
        return;
    }

    // Determine the event type based on the current state before toggling
    const eventType = isOn ? 'sub_out' : 'sub_in';

    // Update the data attribute to reflect the new state
    row.data('oncourt', !isOn);

    // Update the visual classes based on the new state
    if (!isOn) {
        row.addClass(team === 'lasalle' ? 'on-court' : 'on-court-opp');
    } else {
        row.removeClass('on-court on-court-opp');
    }

    // Physically move the row up or down
    reorderPlayers(container);

    // Handle Database and Broadcasting
    if (broadcast) {
        // Record the specific sub event in the DB (Only the Master does this)
        recordStat(btn, eventType);

        // Tell the server to update the other admins' UIs
        socket.emit('sync_on_court_toggle', {
            gameId: gameId,
            rowId: rowId // Pass the unique HTML ID of the row
        });
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


// Helper to reverse substitution UI when an undo happens
function reverseSubstitutionUI(deletedEvent) {
    const team = deletedEvent.team;
    const playerId = deletedEvent.playerId;
    const opponentPlayer = deletedEvent.opponentPlayer;

    // Determine the exact HTML ID based on which team the event belonged to
    const rowId = team === 'lasalle' ? `player-${playerId}` : `opp-player-${opponentPlayer.jerseyNumber}`;

    // Find the physical HTML row
    const targetRow = $(`#${rowId}`);


    if (targetRow.length) {
        const container = targetRow.parent();
        const isOnCourt = targetRow.data('oncourt');
        const eventType = deletedEvent.eventType;

        // Reverse the visual state
        if (eventType === 'sub_in' &&isOnCourt) {
            targetRow.data('oncourt', false);
            targetRow.removeClass(team === 'lasalle' ? 'on-court' : 'on-court-opp');
            reorderPlayers(container);  // Push the active players back to the top
            
        } else if (eventType === 'sub_out' && !isOnCourt) {
            targetRow.data('oncourt', true);
            targetRow.addClass(team === 'lasalle' ? 'on-court' : 'on-court-opp');
            reorderPlayers(container);  // Push the active players back to the top
        }
        
        // reorderPlayers(container);
    }
}

// function to undo the last recorded event
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

            const event = res.lastEvent;
            
            if (event && (event.eventType === 'sub_in' || event.eventType === 'sub_out')) {
                reverseSubstitutionUI(event);
            }

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

// function to convert period number to label (Q1, Q2, Q3, Q4, OT1, OT2, etc.)
function periodLabel(p) {
    if (p <= 4) return 'Q' + p;
    return 'OT' + (p - 4);
}

// function to update all player stat boxes based on the latest stats data
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


// Helper to render the team stats boxes based on aggregated stats
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


// Helper to render the play-by-play feed based on the latest events data
function renderEvents(events) {
    let html = '';
    if (!events || events.length === 0) {
        html = '<div class="text-white text-center py-4 small">No events yet</div>';
    } else {
        events.forEach(e => {
            const fullName = e.playerId?.firstName + " " + e.playerId?.lastName;
            const isHome = e.team === 'lasalle';
            const jersey = isHome ? (e.playerId?.jerseyNumber || '?') : (e.opponentPlayer?.jerseyNumber || '?');
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


// function to load the latest stats from the server and update the UI accordingly
function loadStats() {
    $.get(`${API}/api/games/${gameId}/stats`, function (res) {
        const fetchedStats = res.stats || res;

        // Safely check against the new fallback variable
        if (!Array.isArray(fetchedStats)) {
            console.warn("Could not load stats array:", res);
            return; 
        }

        allStats = fetchedStats;
        updateAllPlayerStats();
    });
}

// function to load the latest events from the server and update the play-by-play feed accordingly
function loadEvents() {
    $.get(`${API}/api/games/${gameId}/events`, function (res) {
        const fetchedEvents = res.events || res;
        renderEvents(fetchedEvents);
    });
}


// ===================== HELPERS =====================

// helper to convert string time to number
function mmssToSeconds(str) {
    // Force to string and trim whitespace
    if (typeof str !== 'string') {
        console.error("Input is not a string:", str);
        return NaN;
    }
    
    const cleanStr = str.trim();
    if (!cleanStr) return NaN;

    // Split and clean each individual part
    const parts = cleanStr.split(':').map(p => p.trim());
    
    if (parts.length !== 2) {
        console.error("String does not match MM:SS format:", cleanStr);
        return NaN;
    }

    // Parse using parseFloat to handle potential decimals (like 12.5s)
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);

    if (isNaN(minutes) || isNaN(seconds)) {
        return NaN;
    }

    // Final calculation (using Math.floor if you want whole seconds)
    return Math.floor((minutes * 60) + seconds);
}


// helper to convert seconds back to MM:SS format
function formatClock(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}


// helper to update the clock display based on the current clockSeconds value
function updateClockDisplay() {
    $('#hdr-clock').text(formatClock(clockSeconds));
}


// ===================== CLOCK CONTROL =====================

// Helper to ensure both teams have exactly 5 players on the court
function checkFivePlayers() {
    const homeCount = $('#home-players-panel .on-court').length;
    const oppCount = $('#opp-players-panel .on-court-opp').length;

    if (homeCount !== 5 || oppCount !== 5) {
        alert(`Lineup Error: Home has ${homeCount} and Away has ${oppCount} on the court. Both teams must have exactly 5 players to run the clock.`);
        return false;
    }
    return true;
}

// Game controls
$('#ctrl-start').click(function () {
    // Before starting the clock for the first time, we must ensure both teams have 5 players on the court.
    if (!checkFivePlayers()) return;

    const period = gameData?.currentPeriod || 0;

    const isFirstQuarter = period === 1;
    const isEqual10Min = clockSeconds === 600;  // 10:00

    let homeStarters = [];
    let awayStarters = [];

    // check if the game is just starting
    if (isFirstQuarter && isEqual10Min) {
        // Gather the 5 starters from DOM
        $('#home-players-panel .on-court').each(function() {
            homeStarters.push($(this).data('player-id'));
        });

        $('#opp-players-panel .on-court-opp').each(function() {
            awayStarters.push($(this).data('jersey'));
        });

        /*
        // Prevent game start if there aren't 5 players
        if (homeStarters.length !== 5 || awayStarters.length !== 5) {
            alert("You must have exactly 5 players on the court for both teams to start the game.");
            return; // Stop execution, don't send the AJAX request
        } 
        */
    
    } else {
        // If the game is just resuming from a pause, we don't want to send empty arrays 
        // that might accidentally overwrite the starters in your backend.
        homeStarters = undefined;
        awayStarters = undefined;
    }

    // Tell the SERVER to start the clock
    socket.emit('cmd_start_clock', gameId);

    $.ajax({ 
        url: `${API}/api/games/${gameId}`,
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ 
            status: 'PLAYING',
            homeStarters: homeStarters,
            awayStarters: awayStarters
        }),
        success: function (res) {
            gameData = res.updatedGame || res;
        },
        error: function(err) {
            console.error("Failed to startgame:", err);
            alert("Failed to start the game. Check the console.");
        }
    });
});


$('#ctrl-pause').click(function () {
    // Tell the SERVER to pause the clock
    socket.emit('cmd_pause_clock', gameId);

    $.ajax({ 
        url: `${API}/api/games/${gameId}`, 
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ 
            status: 'PAUSED',
            gameClock: formatClock(clockSeconds)
        }),
        success: function (res) {
            gameData = res.updatedGame || res;
        },
        error: function(err) {
            console.error("Failed to pause game:", err);
            alert("Failed to pause the game. Check the console.");
        }
    });
});

$('#ctrl-resume').click(function () {
    // Before resuming the clock, we must ensure both teams have 5 players on the court.
    if (!checkFivePlayers()) return;

    // Tell the SERVER to start the clock
    socket.emit('cmd_start_clock', gameId);

    $.ajax({ 
        url: `${API}/api/games/${gameId}`, 
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ status: 'PLAYING' }),
        success: function (res) {
            gameData = res.updatedGame || res;
        },
        error: function(err) {
            console.error("Failed to resume game:", err);
            alert("Failed to resume the game. Check the console.");
        }
    });
});

$('#ctrl-next-q').click(function () {
    // Pause the server clock immediately
    socket.emit('cmd_pause_clock', gameId);

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
            gameData = res.updatedGame || res;
            updateScoreboard();
            
            // Tell the SERVER we reset the clock for a new quarter
            socket.emit('cmd_set_clock', { gameId: gameId, newSeconds: clockSeconds });
        },
        error: function(err) {
            console.error("Failed to start next quarter:", err);
            alert("Failed to start the next quarter. Check the console.");
        }
    });
});

$('#ctrl-ot').click(function () {
    // Pause the server clock immediately
    socket.emit('cmd_pause_clock', gameId);

    $.ajax({ 
        url: `${API}/api/games/${gameId}/overtime`, 
        method: 'POST',
        success: function (res) {
            gameData = res.game || res;
            clockSeconds = 300;
            updateClockDisplay();
            updateScoreboard();
            
            // Tell the SERVER we reset the clock for OT
            socket.emit('cmd_set_clock', { gameId: gameId, newSeconds: clockSeconds });
        },
        error: function(err) {
            console.error("Failed to start overtime:", err);
            alert("Failed to start overtime. Check the console.");
        }
    });
});

$('#ctrl-end').click(function () {
    if (!confirm('End the game?')) return;

    // Tell the SERVER to kill the clock and broadcast the end state
    socket.emit('cmd_end_game', gameId);

    $.ajax({ 
        url: `${API}/api/games/${gameId}`, 
        method: 'PATCH', 
        contentType: 'application/json',
        data: JSON.stringify({ 
            status: 'ENDED',
            gameClock: formatClock(clockSeconds) 
        }),
        success: function (res) {
            gameData = res.updatedGame || res;

        },
        error: function(err) {
            console.error("Failed to end game:", err);
            alert("Failed to end the game. Check the console.");
        }
    });
});


// ======== WEBSOCKET LISTENERS =======

function setupSocketListeners() {
   // --- Listen for initial connections AND Reconnections ---
    socket.on('connect', () => {
        console.log("Socket properly connected/reconnected!");
        
        // Ensure we actually have a game loaded on the screen
        if (typeof gameId !== 'undefined' && gameId) {
            
            // rejoin the room after a disconnect!
            socket.emit('join_game', gameId);
            
            // Now that we are safely back in the room, ask for the data!
            socket.emit('request_ui_sync', gameId);
            
            if (typeof fetchGameDetails === 'function') {
                fetchGameDetails(); 
            }
        }
    });


    // Listen for the relentless server ticks
    socket.on('clock_tick', (data) => {
        clockSeconds = data.clockSeconds;
        updateClockDisplay();
    });

    

    // Listen for UI State changes (Play/Pause/End)
    socket.on('clock_control_updated', (data) => {
        console.log("Server commanded clock state change:", data.action);

        if (data.action === 'start') {
            isRunning = true;
            $('#ctrl-start, #ctrl-resume').addClass('d-none');
            $('#ctrl-pause').removeClass('d-none');
            $('.ft-btn').prop('disabled', true).addClass('disabled');
            
        } else if (data.action === 'pause') {
            isRunning = false;
            $('#ctrl-pause').addClass('d-none');
            // $('.ft-btn').prop('disabled', true).addClass('disabled');
            
            // Smart toggle for Start vs Resume based on what period we are in
            const period = gameData?.currentPeriod || 1;
            const fullPeriodSeconds = period > 4 ? 300 : 600;

            if (clockSeconds === fullPeriodSeconds) {
                $('#ctrl-start').removeClass('d-none');
                $('#ctrl-resume').addClass('d-none');
            } else {
                $('#ctrl-start').addClass('d-none');
                $('#ctrl-resume').removeClass('d-none');
            }

        } else if (data.action === 'end') {
            isRunning = false;
            $('#game-controls').html('<span class="badge bg-danger">FINAL</span>');
            $('#hdr-clock').text("00:00");
            $('.stat-btn, .sub-btn, #undo-btn').prop('disabled', true);

        } else if (data.action === 'foul') {
            $('.ft-btn').prop('disabled', false).removeClass('disabled');
        }

        if (typeof updateControls === "function") updateControls();
    });


    // --- Listen for stat updates (For other admins or viewers) ---
    socket.on('stat_recorded', (data) => {
        console.log("A stat was updated by someone else!", data);

        // Hydrate all global variables
        gameData = data.updatedGame; 
        allStats = data.updatedStats;

        // Refresh the necessary panels to keep everyone in sync
        updateScoreboard(); // Reloads the UI scoreboard
        updateAllPlayerStats(); // Refreshes all player stat boxes
        renderEvents(data.events); // Re-render the play-by-play feed with the latest events
        
    });

    // -- Listen for game status updates (For other admins or viewers) --
    socket.on('game_status_updated', (data) => {
        console.log("Game status updated by someone else!", data);
        gameData = data.updatedGame; // Update the global gameData variable with the latest from the server
        updateControls();
        updateScoreboard();
    });

    // -- Listen for undo actions (For other admins or viewers) --
    socket.on('event_undone', (data) => {
        console.log("An undo was performed by someone else!", data);
        gameData = data.updatedGame; // Update the global gameData variable with the latest from the server
        allStats = data.updatedStats; // Update the global stats variable with the latest from the server
        updateScoreboard();
        updateAllPlayerStats();
        renderEvents(data.events);

        const event = data.lastEvent;

        if (event && (event.eventType === 'sub_in' || event.eventType === 'sub_out')) {
            reverseSubstitutionUI(event);
        }
    });

    // -- Listen for add overtime (For other admins or viewers) --
    socket.on('overtime_added', (data) => {
        console.log("Overtime added by someone else!", data);
        gameData = data.game; // Update the global gameData variable with the latest from the server
        clockSeconds = 300; // Set OT clock to 5 minutes
        updateClockDisplay();
        updateScoreboard();
    });


    // -- Listen for UI/Layout changes (Sortable drags or Substitutions) --
    socket.on('ui_layout_synced', (data) => {
        console.log("UI Layout changed by another admin:", data.panelId);

        const panel = document.getElementById(data.panelId);
        if (!panel) return;

        // Loop through the incoming order array
        data.order.forEach(elementId => {
            const el = document.getElementById(elementId);
            if (el) {
                // In the DOM, appending an element that already exists inside the same container
                // simply moves it to the bottom. By looping through the array in order, 
                // it reconstructs the exact visual layout without duplicating anything!
                panel.appendChild(el);
            }
        });
    });


    // -- Listen for Substitution UI Toggles --
    socket.on('on_court_toggled', (data) => {
        console.log(`Row toggled by another admin: ${data.rowId}`);
        
        // Find the exact row that Admin A toggled
        const targetRow = $(`#${data.rowId}`);
        
        if (targetRow.length) {
            // Call the toggle function, passing the row itself as the "btn"
            // (jQuery's .closest() will gracefully handle this!)
            // Pass FALSE so it doesn't bounce back or hit the DB!
            if (typeof toggleOnCourt === 'function') {
                toggleOnCourt(targetRow[0], false);
            }
        }
    });


    // -- ACTIVE CONNECTION: Hears a request and reads its screen --
    socket.on('request_ui_sync', () => {
        // If this connection hasn't loaded players yet, ignore the request
        if ($('.player-row').length === 0) return;

        // Take a snapshot of the exact HTML IDs and their current order
        const homeOrder = $('#home-players-panel').children('.player-row').map((i, el) => el.id).get();
        const oppOrder = $('#opp-players-panel').children('.player-row').map((i, el) => el.id).get();
        
        // Find every HTML ID that currently has the on-court status
        const onCourtIds = $('.player-row').filter(function() { 
            return $(this).data('oncourt') === true; 
        }).map((i, el) => el.id).get();

        // Send the snapshot back to the room
        socket.emit('send_ui_sync', {
            gameId: gameId,
            homeOrder: homeOrder,
            oppOrder: oppOrder,
            onCourtIds: onCourtIds,
            isRunning: isRunning,
            clockSeconds: clockSeconds
        });
    });


    // RELOADED CONNECTION: Receives the snapshot and applies it --
    socket.on('receive_ui_sync', (data) => {
        console.log("Hydrating UI layout from another active connection...");

        // Reorder the Home Panel
        const homePanel = document.getElementById('home-players-panel');
        if (homePanel && data.homeOrder) {
            data.homeOrder.forEach(id => {
                const el = document.getElementById(id);
                if (el) homePanel.appendChild(el); 
            });
        }

        // Reorder the Opponent Panel
        const oppPanel = document.getElementById('opp-players-panel');
        if (oppPanel && data.oppOrder) {
            data.oppOrder.forEach(id => {
                const el = document.getElementById(id);
                if (el) oppPanel.appendChild(el);
            });
        }

        // Apply On-Court visual statuses
        if (data.onCourtIds) {
            // Reset everyone to the bench first to guarantee a clean slate
            $('.player-row').data('oncourt', false).removeClass('on-court on-court-opp');
            
            // Loop through the snapshot and put the right people back on the court
            data.onCourtIds.forEach(id => {
                const row = $(`#${id}`);
                if (row.length) {
                    const team = row.data('team');
                    row.data('oncourt', true);
                    row.addClass(team === 'lasalle' ? 'on-court' : 'on-court-opp');
                }
            });
        }

        // Hydrate Control & Clock State
        if (data.isRunning !== undefined) {
            isRunning = data.isRunning;
            clockSeconds = data.clockSeconds;
            
            // Force the physical numbers on the clock to match the active connection exactly
            if (typeof updateClockDisplay === 'function') updateClockDisplay();
            
            // Lock/Unlock the appropriate UI buttons based on the synced state
            if (isRunning) {
                
                // Replicate the 'start' action UI
                $('#ctrl-start, #ctrl-resume').addClass('d-none');
                $('#ctrl-pause').removeClass('d-none');
                $('.ft-btn').prop('disabled', true).addClass('disabled');
                
            } else {
                // Clock is paused. Show Resume instead of Start if time has elapsed
                $('#ctrl-pause').addClass('d-none');
                
                // Find out what a "full clock" means for the current period
                const isOvertime = (quarter > 4); 
                const fullPeriodSeconds = isOvertime ? 300 : 600;

                // If the clock is completely full for this specific period, show Start
                if (clockSeconds === fullPeriodSeconds) {
                    $('#ctrl-start').removeClass('d-none');
                    $('#ctrl-resume').addClass('d-none');
                } 
                // If it's anything less than full, show Resume
                else if (clockSeconds < fullPeriodSeconds && clockSeconds > 0) {
                    $('#ctrl-start').addClass('d-none');
                    $('#ctrl-resume').removeClass('d-none');
                }
            }
            
            // Refresh your main controls helper if you have one
            if (typeof updateControls === 'function') {
                updateControls();
            }
        }
    });
}

// =====================================

// ==========================================
// BACKGROUND TAB CATCH-UP LOGIC
// ==========================================
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        console.log("Tab woke up! Checking connection...");
        
        if (!socket.connected) {
            // If the connection died, just tell it to reconnect.
            // Our socket.on('connect') listener will handle the syncing once it's ready!
            socket.connect();
            
        } else {
            // If it never disconnected (just went to sleep briefly), sync immediately!
            if (typeof gameId !== 'undefined' && gameId) {
                socket.emit('request_ui_sync', gameId);
                if (typeof fetchGameDetails === 'function') fetchGameDetails(); 
            }
        }
    }
});