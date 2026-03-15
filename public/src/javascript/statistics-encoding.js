document.addEventListener("DOMContentLoaded", () => {

  const gameSelect = document.getElementById("gameSelect");
  const addStatsBtn = document.getElementById("addStatsBtn");
  const statsTableBody = document.getElementById("statsTableBody");

  const games = [
    { id: "1", name: "Game 1 - vs Eagles" },
    { id: "2", name: "Game 2 - vs Falcons" }
  ];

  games.forEach((game) => {
    const option = document.createElement("option");
    option.value = game.id;
    option.textContent = game.name;
    gameSelect.appendChild(option);
  });

  gameSelect.addEventListener("change", () => {

    const gameId = gameSelect.value;

    if (!gameId) {
      addStatsBtn.disabled = true;
      statsTableBody.innerHTML =
        `<tr><td colspan="15" style="text-align:center">Select a game</td></tr>`;
      return;
    }

    addStatsBtn.disabled = false;

    loadStats(gameId);

  });


  async function loadStats(gameId) {

    try {

      const response = await fetch(`/api/gameStats/game/${gameId}`);
      const result = await response.json();

      const stats = result.data;

      if (!stats || stats.length === 0) {

        statsTableBody.innerHTML =
          `<tr><td colspan="15" style="text-align:center">No stats yet</td></tr>`;

        return;

      }

      statsTableBody.innerHTML = "";

      stats.forEach(stat => {

        const totals = stat.totals || {};

        const playerName =
          stat.playerId?.fullName ||
          stat.playerId?.name ||
          "Unknown Player";

        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${playerName}</td>
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
            <button class="edit-btn" data-id="${stat._id}">Edit</button>
            <button class="delete-btn" data-id="${stat._id}">Delete</button>
          </td>
        `;

        statsTableBody.appendChild(row);

      });

    } catch (err) {

      console.error(err);

      statsTableBody.innerHTML =
        `<tr><td colspan="15" style="text-align:center">Error loading stats</td></tr>`;

    }

  }

});