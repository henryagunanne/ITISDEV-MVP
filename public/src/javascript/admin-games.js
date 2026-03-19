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
    const tournament  = document.getElementById('addTournament').value;
    const opponent    = document.getElementById('addOpponent').value.trim();
    const venue       = document.getElementById('addVenue').value.trim();
    const date        = document.getElementById('addDate').value;
    const time        = document.getElementById('addTime').value;
    const status      = document.getElementById('addStatus').value;
    const teamScore   = Number(document.getElementById('addTeamScore').value || 0);
    const oppScore    = Number(document.getElementById('addOppScore').value || 0);

    const errEl = document.getElementById('addErrorMsg');

    if (!tournament || !opponent || !venue || !date || !time) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
    }

    const gameDate  = new Date(date).toISOString();
    const startTime = new Date(`${date}T${time}`).toISOString();

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
                teamScore,
                opponentScore: oppScore
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
    document.getElementById('editGameId').value      = row.dataset.id;
    document.getElementById('editTournament').value  = row.dataset.tournament || '';
    document.getElementById('editOpponent').value    = row.dataset.opponent || '';
    document.getElementById('editVenue').value       = row.dataset.venue || '';
    document.getElementById('editDate').value        = toDateInputValue(row.dataset.date);
    document.getElementById('editTime').value        = toTimeInputValue(row.dataset.date);
    document.getElementById('editStatus').value      = row.dataset.status || 'Scheduled';
    document.getElementById('editTeamScore').value   = row.dataset.teamscore || 0;
    document.getElementById('editOppScore').value    = row.dataset.opponentscore || 0;
    openModal('editModal');
}

async function updateGame() {
    const id          = document.getElementById('editGameId').value;
    const tournament  = document.getElementById('editTournament').value;
    const opponent    = document.getElementById('editOpponent').value.trim();
    const venue       = document.getElementById('editVenue').value.trim();
    const date        = document.getElementById('editDate').value;
    const time        = document.getElementById('editTime').value;
    const status      = document.getElementById('editStatus').value;
    const teamScore   = Number(document.getElementById('editTeamScore').value || 0);
    const oppScore    = Number(document.getElementById('editOppScore').value || 0);

    const errEl = document.getElementById('editErrorMsg');

    if (!tournament || !opponent || !venue || !date || !time) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
    }

    const gameDate  = new Date(date).toISOString();
    const startTime = new Date(`${date}T${time}`).toISOString();

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
                teamScore,
                opponentScore: oppScore
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
        const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
        const data = await res.json();

        closeModal('deleteModal');
        if (!res.ok) {
            showToast(data.message || 'Cannot delete game.', true);
            return;
        }
        showToast('Game deleted successfully!');
        setTimeout(() => location.reload(), 1200);
    } catch (err) {
        closeModal('deleteModal');
        showToast('Network error. Please try again.', true);
    }
}
