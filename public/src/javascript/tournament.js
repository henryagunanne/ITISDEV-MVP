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
    $('#createTournamentForm').on('submit', function(e) {
        e.preventDefault();
        const $form = $(this);

        // Check form validity
        if (this.checkValidity() === false) {
            e.stopPropagation();
            $form.addClass('was-validated');
            return;
        }
  
        const formData = new FormData(this);
        const plainObject = Object.fromEntries(formData.entries());

        $.ajax({
            url: "/api/tournaments/create",
            method: "POST",
            contentType: "application/json", // send as JSON
            data: JSON.stringify(plainObject),
            success: function(res) {
                showToast(res.message || 'Tournament created successfully', false);
                $form[0].reset();
                $form.removeClass('was-validated');
                setTimeout(function() {
                    window.location.reload();
                }, 1200);
              },
              error: function(xhr) {
                let msg = 'Error creating tournament';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                  msg = xhr.responseJSON.message;
                }
                showToast(msg, true);
              }
            });
    });



    // DYNAMIC FORM ACTION
    $("#editTournamentForm").on("submit", function (e) {
        e.preventDefault();
        const $form = $(this);
        const id = $("#editId").val();

        // Check form validity
        if (this.checkValidity() === false) {
            e.stopPropagation();
            $form.addClass('was-validated');
            return;
        }
  
        const formData = {
            name: $('#editName').val(),
            league: $('#editLeague').val(),
            season: $('#editSeason').val(),
            description: $('#editDescription').val(),
            startDate: $('#editStartDate').val(),
            endDate: $('#editEndDate').val()
        }

        console.log(formData)

        $.ajax({
            url: `/api/tournaments/${id}/update`,
            method: "PUT",
            contentType: "application/json", // send as JSON
            data: JSON.stringify(formData),
            success: function(res) {
                showToast(res.message || 'Tournament updated successfully', false);
                $form[0].reset();
                $form.removeClass('was-validated');
                $("#editTournamentModal").modal("hide");
                setTimeout(function() {
                    window.location.reload();
                }, 1500);
              },
              error: function(xhr) {
                let msg = 'Error updating tournament';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                  msg = xhr.responseJSON.message;
                }
                $("#editTournamentModal").modal("hide");
                showToast(msg, true);
              }
        });
    });


    // FORMAT DATE
    function formatDate(date) {
        if (!date) return "";
        return new Date(date).toISOString().split("T")[0];
    }


    // DELETE CONFIRMATION
    $(".delete-tournament-btn").on("click", function () {
        const id = $(this).data('id');

        openDeleteModal(id);
    });

    $('#cancelDeleteBtn, #closeDeleteModal').on('click', function() {
        const modal = bootstrap.Modal.getInstance($('#deleteModal'));
        modal.hide();
    });


    // ----- DELETE TOURNAMENT -----
    function openDeleteModal(id) {
        $('#deleteTournamentId').val(id);
        $('#deleteConfirmText').text(`Are you sure you want to delete this tournament? This action cannot be undone.`);
        
        const modalElement = $('#deleteModal');
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);

        modalInstance.show();
    }

    

});


async function confirmDelete() {
    const id = $('#deleteTournamentId').val(); 

    const modalElement = $('#deleteModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);

    try {
        const data = await $.ajax({
            url: `/api/tournaments/${id}/delete`,
            method: 'DELETE',
        });

        modalInstance.hide();

        if (!data.success) {
            showToast(data.message || 'Failed to delete tournament.', true);
            return;
        }

        showToast('Tournament deleted successfully!');
        setTimeout(() => location.reload(), 1200);

    } catch (err) {
        modalInstance.hide();
        const errorMsg = err.responseJSON?.message || 'Network error. Please try again.';
        showToast(errorMsg, true);
    }
}


// ----- Toast -----
function showToast(message, isError = false) {
    const $toast = $('#toast'); 
    
    if (!$toast.length) return; 

    $toast.text(message)
          .css('background-color', isError ? '#e74c3c' : '#0b5d3b')
          .show(); 

    setTimeout(() => { 
        $toast.hide();
    }, 3500);
}
