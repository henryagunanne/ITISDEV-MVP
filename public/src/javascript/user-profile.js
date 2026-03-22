$(document).ready(function () {

    /* =========================================
       PROFILE UPDATE
    ========================================= */
    $('#updateProfileForm').on('submit', function (e) {
        e.preventDefault();

        const $form = $(this);
        const $btn = $form.find('button');

        // form validation
        if (this.checkValidity() === false) {
            e.stopPropagation();
            $form.addClass('was-validated');
            return;
        }

        const formData = Object.fromEntries(new FormData(this).entries());

        // UI: disable button
        $btn.prop('disabled', true).text('Saving...');

        $.ajax({
            url: "/api/users/update-profile",
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify(formData),

            success: function (res) {
                showToast(res.message || "Profile updated", false);

                $form.removeClass('was-validated');
            },

            error: function (xhr) {
                const msg = xhr.responseJSON?.message || "Error updating profile";
                showToast(msg, true);
            },

            complete: function () {
                $btn.prop('disabled', false).text('Save Changes');
            }
        });
    });


    /* =========================================
       PASSWORD MATCH VALIDATION (LIVE)
    ========================================= */
    $('#confirmNewPassword').on('input', function () {
        const newPass = $('#newPassword').val();
        const confirm = $(this).val();

        if (newPass !== confirm) {
            this.setCustomValidity("Passwords do not match");
        } else {
            this.setCustomValidity("");
        }
    });


    /* =========================================
       CHANGE PASSWORD
    ========================================= */
    $('#changePasswordForm').on('submit', function (e) {
        e.preventDefault();

        const $form = $(this);
        const $btn = $form.find('button');

        if (this.checkValidity() === false) {
            e.stopPropagation();
            $form.addClass('was-validated');
            return;
        }

        const data = {
            currentPassword: $('#currentPassword').val(),
            newPassword: $('#newPassword').val()
        };

        $btn.prop('disabled', true).text('Updating...');

        $.ajax({
            url: "/api/users//change-password",
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify(data),

            success: function (res) {
                showToast(res.message || "Password updated", false);

                // Reset form cleanly
                $form[0].reset();
                $form.removeClass('was-validated');
            },

            error: function (xhr) {
                const msg = xhr.responseJSON?.message || "Error changing password";
                showToast(msg, true);
            },

            complete: function () {
                $btn.prop('disabled', false).text('Update Password');
            }
        });
    });


    /* =========================================
       TAB UX IMPROVEMENT
    ========================================= */
    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function () {
        // Remove validation styles when switching tabs
        $('.needs-validation').removeClass('was-validated');
    });


    /* =========================================
       AUTO-FOCUS FIRST INPUT
    ========================================= */
    $('#profileTab').on('shown.bs.tab', function () {
        $('#updateProfileForm input:first').focus();
    });

    $('#securityTab').on('shown.bs.tab', function () {
        $('#currentPassword').focus();
    });

});

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