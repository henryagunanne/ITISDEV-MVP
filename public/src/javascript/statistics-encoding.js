document.addEventListener("DOMContentLoaded", () => {

  const gameSelect = document.getElementById("gameSelect");
  const addStatsBtn = document.getElementById("addStatsBtn");
  const statsTableBody = document.getElementById("statsTableBody");

  const statsModal = document.getElementById("statsModal");
  const closeModal = document.getElementById("closeModal");
  const statsForm = document.getElementById("statsForm");

  const hiddenGameId = document.getElementById("gameId");


  // LOAD GAMES FROM API
 

  async function loadGames() {

    try {

      const response = await fetch("/api/games");
      const result = await response.json();

      const games = result.data;

      games.forEach((game) => {

        const option = document.createElement("option");

        option.value = game._id;

        option.textContent = `${game.opponent} (${new Date(game.gameDate).toLocaleDateString()})`;

        gameSelect.appendChild(option);

      });

    } catch (error) {

      console.error("Error loading games:", error);

    }

  }

  loadGames();


  // ===============================
  // GAME SELECT
  // ===============================

  gameSelect.addEventListener("change", () => {

    const gameId = gameSelect.value;

    if (!gameId) {

      addStatsBtn.disabled = true;

      statsTableBody.innerHTML =
        `<tr><td colspan="11" style="text-align:center">Select a game</td></tr>`;

      return;

    }

    addStatsBtn.disabled = false;

    loadStats(gameId);

  });



  // OPEN MODAL
  

  addStatsBtn.addEventListener("click", () => {

    const selectedGame = gameSelect.value;

    hiddenGameId.value = selectedGame;

    statsModal.style.display = "flex";

  });



  // CLOSE MODAL
 

  closeModal.addEventListener("click", () => {

    statsModal.style.display = "none";

  });



  // LOAD STATS
 
async function loadStats(gameId) {

    try {

      const response = await fetch(`/api/gameStats/game/${gameId}`);

      const result = await response.json();

      const stats = result.data;

      if (!stats || stats.length === 0) {

        statsTableBody.innerHTML =
          `<tr><td colspan="11" style="text-align:center">No stats yet</td></tr>`;

        return;

      }

      statsTableBody.innerHTML = "";

      stats.forEach(stat => {

        const totals = stat.totals || {};

        const playerName =
          stat.playerId
            ? `${stat.playerId.firstName} ${stat.playerId.lastName}`
            : "Unknown Player";

        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${playerName}</td>
          <td>${totals.minutesPlayed || 0}</td>
          <td>${totals.points || 0}</td>
          <td>${totals.assists || 0}</td>
          <td>${totals.offensiveRebounds || 0}</td>
          <td>${totals.defensiveRebounds || 0}</td>
          <td>${totals.steals || 0}</td>
          <td>${totals.blocks || 0}</td>
          <td>${totals.turnovers || 0}</td>
          <td>${totals.fouls || 0}</td>
          <td>${totals.plusMinus || 0}</td>
        `;

        statsTableBody.appendChild(row);

      });

    } catch (error) {

      console.error("Error loading stats:", error);

      statsTableBody.innerHTML =
        `<tr><td colspan="11" style="text-align:center">Error loading stats</td></tr>`;

    }

  }


  
  // SAVE STATS

  statsForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const gameId = hiddenGameId.value;

    const playerId = document.getElementById("playerId").value;

    const statsData = {

      gameId,
      playerId,

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
        body: JSON.stringify(statsData)

      });

      const result = await response.json();

      if (result.success) {

        alert("Stats saved successfully");

        statsModal.style.display = "none";

        loadStats(gameId);

        statsForm.reset();

      } else {

        alert("Failed to save stats");

      }

    } catch (error) {

      console.error("Error saving stats:", error);

      alert("Error saving stats");

    }

  });

});