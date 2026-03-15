document.addEventListener("DOMContentLoaded", () => {

  const gameSelect = document.getElementById("gameSelect");
  const addStatsBtn = document.getElementById("addStatsBtn");
  const statsTableBody = document.getElementById("statsTableBody");
  
  const modal = document.getElementById("statsModal");
  const closeModal = document.getElementById("closeModal");
  const statsForm = document.getElementById("statsForm");
  
  let selectedGameId = null;
  
  
  // TEMP GAMES (Replace later with API)
  const games = [
    { id: "1", name: "Game 1 - vs Eagles" },
    { id: "2", name: "Game 2 - vs Falcons" }
  ];
  
  
  // Populate Game Dropdown
  games.forEach(game => {
  
    const option = document.createElement("option");
  
    option.value = game.id;
    option.textContent = game.name;
  
    gameSelect.appendChild(option);
  
  });
  
  
  
  // Game Selection
  gameSelect.addEventListener("change", () => {
  
    selectedGameId = gameSelect.value;
  
    if (!selectedGameId) {
  
      addStatsBtn.disabled = true;
  
      statsTableBody.innerHTML = `
        <tr>
          <td colspan="15" style="text-align:center;padding:20px">
          Select a game to view statistics
          </td>
        </tr>
      `;
  
      return;
    }
  
    addStatsBtn.disabled = false;
  
    loadStats(selectedGameId);
  
  });
  
  
  
  
  // Load Game Stats
  async function loadStats(gameId) {
  
    try {
  
      const response = await fetch(`/api/gameStats/game/${gameId}`);
  
      const result = await response.json();
  
      const stats = result.data;
  
      if (!stats || stats.length === 0) {
  
        statsTableBody.innerHTML = `
          <tr>
            <td colspan="15" style="text-align:center;padding:20px">
            No player stats available for this game.
            </td>
          </tr>
        `;
  
        return;
  
      }
  
      statsTableBody.innerHTML = "";
  
      stats.forEach(stat => {
  
        const totals = stat.totals || {};
  
        const row = document.createElement("tr");
  
        row.innerHTML = `
          <td>${stat.playerId?.fullName || "Player"}</td>
          <td>${totals.minutesPlayed || 0}</td>
          <td>${totals.points || 0}</td>
          <td>${totals.fieldGoalsMade || 0}/${totals.fieldGoalsAttempted || 0}</td>
          <td>${totals.threePointersMade || 0}/${totals.threePointersAttempted || 0}</td>
          <td>${totals.freeThrowsMade || 0}/${totals.freeThrowsAttempted || 0}</td>
          <td>${totals.offensiveRebounds || 0}</td>
          <td>${totals.defensiveRebounds || 0}</td>
          <td>${totals.assists || 0}</td>
          <td>${totals.steals || 0}</td>
          <td>${totals.blocks || 0}</td>
          <td>${totals.turnovers || 0}</td>
          <td>${totals.fouls || 0}</td>
          <td>${totals.plusMinus || 0}</td>
          <td>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </td>
        `;
  
        statsTableBody.appendChild(row);
  
      });
  
    }
    catch (error) {
  
      console.error("Error loading stats:", error);
  
    }
  
  }
  
  
  
  
  // Open Modal
  addStatsBtn.addEventListener("click", () => {
  
    modal.style.display = "flex";
  
  });
  
  
  
  
  // Close Modal
  closeModal.addEventListener("click", () => {
  
    modal.style.display = "none";
  
  });
  
  
  
  
  // Submit Stats
  statsForm.addEventListener("submit", async (e) => {
  
    e.preventDefault();
  
    if (!selectedGameId) {
  
      alert("Please select a game first");
  
      return;
  
    }
  
    const data = {
  
      gameId: selectedGameId,
  
      playerId: document.getElementById("playerId").value,
  
      periodStats: {
  
        q1: {
  
          minutesPlayed: Number(document.getElementById("minutesPlayed").value),
          points: Number(document.getElementById("points").value),
          assists: Number(document.getElementById("assists").value),
          offensiveRebounds: Number(document.getElementById("offensiveRebounds").value),
          defensiveRebounds: Number(document.getElementById("defensiveRebounds").value),
          steals: Number(document.getElementById("steals").value),
          blocks: Number(document.getElementById("blocks").value),
          turnovers: Number(document.getElementById("turnovers").value),
          fouls: Number(document.getElementById("fouls").value),
          plusMinus: Number(document.getElementById("plusMinus").value)
  
        }
  
      }
  
    };
  
  
    try {
  
      const response = await fetch("/api/gameStats/create", {
  
        method: "POST",
  
        headers: {
          "Content-Type": "application/json"
        },
  
        body: JSON.stringify(data)
  
      });
  
      const result = await response.json();
  
      if (!result.success) {
  
        alert(result.message);
  
        return;
  
      }
  
      modal.style.display = "none";
  
      statsForm.reset();
  
      loadStats(selectedGameId);
  
    }
    catch (error) {
  
      console.error("Error saving stats:", error);
  
    }
  
  });
  
  });