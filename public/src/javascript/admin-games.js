// ===== ADMIN GAMES JS =====

// ----- Search & Filter -----
function applyFilters() {
    const search = (document.getElementById('searchOpponent')?.value || '').toLowerCase().trim();
    const result = document.getElementById('filterResult')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';

    const rows = document.querySelectorAll('#gamesTableBody tr[data-id]');
    let visibleCount = 0;

    rows.forEach(row => {
        const opponent = (row.dataset.opponent || '').toLowerCase();
        const rowResult = row.dataset.result || '';
        const rowStatus = row.dataset.status || '';

        const matchesSearch = !search || opponent.includes(search);
        const matchesResult = !result || rowResult === result;
        const matchesStatus = !status || rowStatus === status;

        if (matchesSearch && matchesResult && matchesStatus) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const noResults = document.getElementById('noResults');
    if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
}

document.getElementById('searchOpponent')?.addEventListener('input', applyFilters);
document.getElementById('filterResult')?.addEventListener('change', applyFilters);
document.getElementById('filterStatus')?.addEventListener('change', applyFilters);

// ----- Toast -----
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? '#e74c3c' : '#0b5d3b';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ----- Modal helpers -----
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
    const addErr = document.getElementById('addErrorMsg');
    const editErr = document.getElementById('editErrorMsg');
    if (addErr) addErr.style.display = 'none';
    if (editErr) editErr.style.display = 'none';
}

document.getElementById('openAddModal')?.addEventListener('click', () => {
    document.getElementById('addGameForm')?.reset();
    openModal('addModal');
});
document.getElementById('closeAddModal')?.addEventListener('click', () => closeModal('addModal'));
document.getElementById('closeEditModal')?.addEventListener('click', () => closeModal('editModal'));
document.getElementById('closeDeleteModal')?.addEventListener('click', () => closeModal('deleteModal'));
document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => closeModal('deleteModal'));

['addModal', 'editModal', 'deleteModal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', function (e) {
        if (e.target === this) closeModal(id);
    });
});

// ----- Helpers -----
function toDateInputValue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
}
function toTimeInputValue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toTimeString().slice(0, 5);
}

// ----- ADD GAME -----
async function addGame() {
    const tournament     = document.getElementById('addTournament').value;
    const opponent       = document.getElementById('addOpponent').value.trim();
    const venue          = document.getElementById('addVenue').value.trim();
    const date           = document.getElementById('addDate').value;
    const time           = document.getElementById('addStartTime').value;
    const status         = document.getElementById('addStatus').value;
    const currentPeriod  = Number(document.getElementById('addCurrentPeriod').value || 1);
    const gameClock      = document.getElementById('addGameClock').value || '10:00';
    const teamScore      = Number(document.getElementById('addTeamScore').value || 0);
    const oppScore       = Number(document.getElementById('addOppScore').value || 0);
    
    // Quarter scores
    const q1Team = Number(document.getElementById('addQ1Team').value || 0);
    const q1Opp  = Number(document.getElementById('addQ1Opp').value || 0);
    const q2Team = Number(document.getElementById('addQ2Team').value || 0);
    const q2Opp  = Number(document.getElementById('addQ2Opp').value || 0);
    const q3Team = Number(document.getElementById('addQ3Team').value || 0);
    const q3Opp  = Number(document.getElementById('addQ3Opp').value || 0);
    const q4Team = Number(document.getElementById('addQ4Team').value || 0);
    const q4Opp  = Number(document.getElementById('addQ4Opp').value || 0);

    const errEl = document.getElementById('addErrorMsg');

    if (!tournament || !opponent || !venue || !date || !time) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
    }

    const gameDate  = new Date(date).toISOString();
    const startTime = new Date(`${date}T${time}`).toISOString();
    
    const quarterScores = {
        q1: { team: q1Team, opponent: q1Opp },
        q2: { team: q2Team, opponent: q2Opp },
        q3: { team: q3Team, opponent: q3Opp },
        q4: { team: q4Team, opponent: q4Opp },
        overtimes: []
    };

    try {
        const res = await fetch('/api/games/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tournament,
                opponent,
                venue,
                gameDate,
                startTime,
                status,
                currentPeriod,
                gameClock,
                teamScore,
                opponentScore: oppScore,
                quarterScores
            })
        });
        const data = await res.json();

        if (!res.ok) {
            errEl.textContent = data.message || 'Failed to add game.';
            errEl.style.display = 'block';
            return;
        }

        closeModal('addModal');
        showToast(`Game vs ${opponent} added!`);
        setTimeout(() => location.reload(), 1200);
    } catch (err) {
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
    }
}

// ----- EDIT GAME -----
function openEditModal(btn) {
    const row = btn.closest('tr');
    const gameId = row.dataset.id;
    
    // Fetch full game data to populate all fields including quarter scores
    fetch(`/api/games/${gameId}`)
        .then(res => res.json())
        .then(data => {
            const game = data.game;
            document.getElementById('editGameId').value = gameId;
            document.getElementById('editTournament').value = game.tournament?._id || '';
            document.getElementById('editOpponent').value = game.opponent || '';
            document.getElementById('editVenue').value = game.venue || '';
            document.getElementById('editDate').value = toDateInputValue(game.gameDate);
            document.getElementById('editStartTime').value = toTimeInputValue(game.startTime || game.gameDate);
            document.getElementById('editStatus').value = game.status || 'Scheduled';
            document.getElementById('editCurrentPeriod').value = game.currentPeriod || 1;
            document.getElementById('editGameClock').value = game.gameClock || '10:00';
            document.getElementById('editTeamScore').value = game.teamScore || 0;
            document.getElementById('editOppScore').value = game.opponentScore || 0;
            
            // Quarter scores
            const qs = game.quarterScores || {};
            document.getElementById('editQ1Team').value = qs.q1?.team || 0;
            document.getElementById('editQ1Opp').value = qs.q1?.opponent || 0;
            document.getElementById('editQ2Team').value = qs.q2?.team || 0;
            document.getElementById('editQ2Opp').value = qs.q2?.opponent || 0;
            document.getElementById('editQ3Team').value = qs.q3?.team || 0;
            document.getElementById('editQ3Opp').value = qs.q3?.opponent || 0;
            document.getElementById('editQ4Team').value = qs.q4?.team || 0;
            document.getElementById('editQ4Opp').value = qs.q4?.opponent || 0;
            
            openModal('editModal');
        })
        .catch(err => {
            console.error('Error loading game data:', err);
            showToast('Error loading game data', true);
        });
}

async function updateGame() {
    const id             = document.getElementById('editGameId').value;
    const tournament     = document.getElementById('editTournament').value;
    const opponent       = document.getElementById('editOpponent').value.trim();
    const venue          = document.getElementById('editVenue').value.trim();
    const date           = document.getElementById('editDate').value;
    const time           = document.getElementById('editStartTime').value;
    const status         = document.getElementById('editStatus').value;
    const currentPeriod  = Number(document.getElementById('editCurrentPeriod').value || 1);
    const gameClock      = document.getElementById('editGameClock').value || '10:00';
    const teamScore      = Number(document.getElementById('editTeamScore').value || 0);
    const oppScore       = Number(document.getElementById('editOppScore').value || 0);
    
    // Quarter scores
    const q1Team = Number(document.getElementById('editQ1Team').value || 0);
    const q1Opp  = Number(document.getElementById('editQ1Opp').value || 0);
    const q2Team = Number(document.getElementById('editQ2Team').value || 0);
    const q2Opp  = Number(document.getElementById('editQ2Opp').value || 0);
    const q3Team = Number(document.getElementById('editQ3Team').value || 0);
    const q3Opp  = Number(document.getElementById('editQ3Opp').value || 0);
    const q4Team = Number(document.getElementById('editQ4Team').value || 0);
    const q4Opp  = Number(document.getElementById('editQ4Opp').value || 0);

    const errEl = document.getElementById('editErrorMsg');

    if (!tournament || !opponent || !venue || !date || !time) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
    }

    const gameDate  = new Date(date).toISOString();
    const startTime = new Date(`${date}T${time}`).toISOString();
    
    const quarterScores = {
        q1: { team: q1Team, opponent: q1Opp },
        q2: { team: q2Team, opponent: q2Opp },
        q3: { team: q3Team, opponent: q3Opp },
        q4: { team: q4Team, opponent: q4Opp },
        overtimes: []
    };

    try {
        const res = await fetch(`/api/games/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tournament,
                opponent,
                venue,
                gameDate,
                startTime,
                status,
                currentPeriod,
                gameClock,
                teamScore,
                opponentScore: oppScore,
                quarterScores
            })
        });
        const data = await res.json();

        if (!res.ok) {
            errEl.textContent = data.message || 'Failed to update game.';
            errEl.style.display = 'block';
            return;
        }

        closeModal('editModal');
        showToast(`Game vs ${opponent} updated!`);
        setTimeout(() => location.reload(), 1200);
    } catch (err) {
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
    }
}

// ----- DELETE GAME -----
function openDeleteModal(id, opponent) {
    document.getElementById('deleteGameId').value = id;
    document.getElementById('deleteConfirmText').textContent =
        `Are you sure you want to delete the game vs "${opponent}"? This action cannot be undone.`;
    openModal('deleteModal');
}

async function confirmDelete() {
    const id = document.getElementById('deleteGameId').value;
    try {
        const res = await fetch(`/api/games/${id}`, {
            method: 'DELETE',
            credentials: 'same-origin' // <-- ADD THIS LINE
        });
        const data = await res.json();

        closeModal('deleteModal');
        if (!res.ok || !data.success) {
            showToast(data.message || 'Failed to delete game.', true);
            return;
        }
        showToast('Game deleted successfully!');
        setTimeout(() => location.reload(), 1200);
    } catch (err) {
        closeModal('deleteModal');
        showToast('Network error. Please try again.', true);
    }
}

// --- VIEW GAME FUNCTIONALITY ---

function openViewModal(gameId) {
    document.getElementById('viewModal').style.display = 'block';
    document.getElementById('viewGameDetails').innerHTML = '<p>Loading...</p>';

    fetch(`/api/games/${gameId}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.game) {
                const game = data.game;
                // Format quarter scores
                const qs = game.quarterScores || {};
                let quarterScoresHtml = `
                    <tr>
                        <th>Quarter</th>
                        <th>Team</th>
                        <th>Opponent</th>
                    </tr>
                    <tr>
                        <td>Q1</td>
                        <td>${qs.q1?.team ?? 0}</td>
                        <td>${qs.q1?.opponent ?? 0}</td>
                    </tr>
                    <tr>
                        <td>Q2</td>
                        <td>${qs.q2?.team ?? 0}</td>
                        <td>${qs.q2?.opponent ?? 0}</td>
                    </tr>
                    <tr>
                        <td>Q3</td>
                        <td>${qs.q3?.team ?? 0}</td>
                        <td>${qs.q3?.opponent ?? 0}</td>
                    </tr>
                    <tr>
                        <td>Q4</td>
                        <td>${qs.q4?.team ?? 0}</td>
                        <td>${qs.q4?.opponent ?? 0}</td>
                    </tr>
                `;
                if (qs.overtimes && qs.overtimes.length > 0) {
                    qs.overtimes.forEach((ot, idx) => {
                        quarterScoresHtml += `
                            <tr>
                                <td>OT${idx + 1}</td>
                                <td>${ot.team ?? 0}</td>
                                <td>${ot.opponent ?? 0}</td>
                            </tr>
                        `;
                    });
                }

                document.getElementById('viewGameDetails').innerHTML = `
                    <p><strong>Opponent:</strong> ${game.opponent}</p>
                    <p><strong>Start Time:</strong> ${game.startTime ? new Date(game.startTime).toLocaleString() : '—'}</p>
                    <p><strong>Current Period:</strong> ${game.currentPeriod ?? '—'}</p>
                    <p><strong>Game Clock:</strong> ${game.gameClock ?? '—'}</p>
                    <p><strong>Status:</strong> ${game.status ?? '—'}</p>
                    <h4 style="margin-top:1rem;">Quarter Scores</h4>
                    <table class="quarter-scores-table" style="width:100%;border-collapse:collapse;">
                        ${quarterScoresHtml}
                    </table>
                `;
            } else {
                document.getElementById('viewGameDetails').innerHTML = '<p class="text-danger">Unable to load game details.</p>';
            }
        })
        .catch(() => {
            document.getElementById('viewGameDetails').innerHTML = '<p class="text-danger">Unable to load game details.</p>';
        });
}

// Close view modal
document.getElementById('closeViewModal').onclick = function() {
    document.getElementById('viewModal').style.display = 'none';
};

// --- DELETE FUNCTIONALITY ---

function openDeleteModal(id, opponent) {
    document.getElementById('deleteGameId').value = id;
    document.getElementById('deleteConfirmText').textContent = `Are you sure you want to delete the game vs. ${opponent}?`;
    document.getElementById('deleteModal').style.display = 'block';
}

document.getElementById('cancelDeleteBtn').onclick = function() {
    document.getElementById('deleteModal').style.display = 'none';
};

document.getElementById('closeDeleteModal').onclick = function() {
    document.getElementById('deleteModal').style.display = 'none';
};

function confirmDelete() {
    const gameId = document.getElementById('deleteGameId').value;
    fetch(`/api/games/${gameId}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Game deleted successfully.');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast('Failed to delete game.', true);
        }
    })
    .catch(() => {
        showToast('Failed to delete game.', true);
    });
}

// --- TOAST FUNCTION ---
function showToast(message, isError) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#d9534f' : '#28a745';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

// --- (Keep your existing code for edit/add as is) ---
