$(document).ready(function () {


    // update date attribute field on focus to date form text
    $("#startDate, #endDate").on("focus", function() {
        $(this).attr("type", "date");
    });
    
    // update date attribute field on blur back to text
    $("#startDate, #endDate").on("blur", function() {
        if (!$(this).val()) {
            $(this).attr("type", "text");
        }
    });

    // EDIT TOURNAMENT
    $(".edit-tournament-btn").on("click", function () {
        const data = $(this).data();

        $("#editId").val(data.id);
        $("#editName").val(data.name);
        $("#editLeague").val(data.league);
        $("#editSeason").val(data.season);
        $("#editDescription").val(data.description);
        $("#editStartDate").val(formatDate(data.start));
        $("#editEndDate").val(formatDate(data.end));

        $("#editTournamentModal").modal("show");
    });

    // Create Tournament form submission handling
    $('#createTournament').on('submit', function(e) {
        e.preventDefault();

        action="/api/tournaments/create"

        // validate form inputs
        if (!this.checkValidity()) {
            e.stopPropagation();
            this.classList.add('was-validated');
            return;
        }
  
        $.ajax({
            url: "/reservations/create",
            method: "POST",
            contentType: "application/json", // send as JSON
            data: JSON.stringify({})
    });

    // DELETE CONFIRMATION
    $(".delete-tournament-btn").on("click", function (e) {
        if (!confirm("Are you sure you want to delete this tournament?")) {
            e.preventDefault();
        }
    });

    // DYNAMIC FORM ACTION
    $("#editTournamentForm").on("submit", function () {
        const id = $("#editId").val();
        $(this).attr("action", `/api/tournaments/${id}/update`);
    });

    // FORMAT DATE (IMPORTANT FIX)
    function formatDate(date) {
        if (!date) return "";
        return new Date(date).toISOString().split("T")[0];
    }


});


// ----- Toast -----
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? '#e74c3c' : '#0b5d3b';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}