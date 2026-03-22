$(document).ready(function () {



    // LIVE PASSWORD MATCH VALIDATION
    $('#confirmPassword').on('input', function () {
        const password = $('#password').val();
        const confirm = $(this).val();

        if (password !== confirm) {
            this.setCustomValidity("Passwords do not match");
        } else {
            this.setCustomValidity("");
        }
    });


    // CREATE USER (AJAX)
    $('#createUserForm').on('submit', function (e) {
        e.preventDefault();
        const $form = $(this);

        // VALIDATION
        if (this.checkValidity() === false) {
            e.stopPropagation();
            $form.addClass('was-validated');
            return;
        }

        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();

        // PASSWORD MATCH CHECK
        if (password !== confirmPassword) {
            showToast("Passwords do not match", true);
            return;
        }

        const formData = new FormData(this);
        const plainObject = Object.fromEntries(formData.entries());

        $.ajax({
            url: "/api/users/create",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(plainObject),

            success: function (res) {
                showToast(res.message || "User created successfully", false);
                $form[0].reset();
                $form.removeClass('was-validated');

                setTimeout(() => location.reload(), 1200);
            },

            error: function (xhr) {
                let msg = "Error creating user";
                if (xhr.responseJSON?.message) msg = xhr.responseJSON.message;

                showToast(msg, true);
            }
        });
    });


    // TOGGLE USER STATUS (Activate / Deactivate)
    $(".toggle-status-btn").on("click", function () {
        const id = $(this).data("id");
        const isActive = $(this).data("active");
        console.log(id)

        const actionText = isActive ? "deactivate" : "activate";

        if (!confirm(`Are you sure you want to ${actionText} this user?`)) return;

        $.ajax({
            url: `/api/users/${id}/${actionText}`,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ isActive: !isActive }),

            success: function (res) {
                showToast(res.message || "User status updated", false);

                setTimeout(() => location.reload(), 1200);
            },

            error: function (xhr) {
                let msg = "Error updating user status";
                if (xhr.responseJSON?.message) msg = xhr.responseJSON.message;

                showToast(msg, true);
            }
        });
    });
    

    // DELETE USER (MATCHING YOUR STYLE)
    $(".delete-user-btn").on("click", function () {
        const id = $(this).data('id');
        openDeleteModal(id, "user");
    });

    $('#cancelDeleteBtn, #closeDeleteModal').on('click', function() {
        const modal = bootstrap.Modal.getInstance($('#deleteModal'));
        modal.hide();
    });


    // ----- DELETE User -----
    function openDeleteModal(id) {
        $('#deleteUserId').val(id);
        $('#deleteConfirmText').text(`Are you sure you want to delete this user? This action cannot be undone.`);
        
        const modalElement = $('#deleteModal');
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);

        modalInstance.show();
    }

});


async function confirmDelete() {
    const id = $('#deleteUserId').val(); 

    const modalElement = $('#deleteModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);

    try {
        const data = await $.ajax({
            url: `/api/users/${id}/delete`,
            method: 'DELETE',
        });

        modalInstance.hide();

        if (!data.success) {
            showToast(data.message || 'Failed to delete user.', true);
            return;
        }

        showToast('User deleted successfully!');
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