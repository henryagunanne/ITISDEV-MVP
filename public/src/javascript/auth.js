$(function () {

    // ==========================================
    // GLOBAL AJAX SETUP (CATCH SESSION TIMEOUTS)
    // ==========================================
    $.ajaxSetup({
        error: function(xhr) {
            // Check if the server responded with our specific 401 Timeout code
            if (xhr.status === 401) {
                // Check if the response contains the specific JSON code
                // to differentiate it from other types of 401 errors
                const response = xhr.responseJSON;
                if (response && response.code === 'SESSION_TIMEOUT') {
                    alert("Session timeout - please login again.");
                    window.location.href = '/'; 
                }
            }
        }
    });


    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        const $form = $(this);

        // Check form validity
        if (this.checkValidity() === false) {
            e.stopPropagation();
            $form.addClass('was-validated');
            return;
        }
        const formData = {
            username: $('#username').val(),
            password: $('#password').val()
        };
        
        $.ajax({
            url: '/auth/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function (res) {
                if (res.message === 'Login successful') {
                    // Redirect to dashboard or home page after successful login
                    window.location.href = '/dashboard';
                } else {
                    $('#loginAlert').text(res.message).removeClass('d-none');
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.error || "Login failed. Please try again.";
                $('#loginAlert').text(msg).removeClass('d-none');
            }
        });
    });

    // handle logout button click
    $('#logoutBtn, #logoutBtn2').on('click', function (e) {
        e.preventDefault();
        $.ajax({
            url: '/auth/logout',
            method: 'POST',
            success: function () {
                // Redirect to login page after logout
                window.location.href = '/';
            },
            error: function () {
                alert("Logout failed. Please try again.");
            }
        });
    });
  });
