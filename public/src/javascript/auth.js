$(function () {
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
                    window.location.href = '/';
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
                window.location.href = '/auth/login';
            },
            error: function () {
                alert("Logout failed. Please try again.");
            }
        });
    });
  });

exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    // Return 401 Unauthorized, not 404
    return res.status(401).json({ success: false, message: "Unauthorized" });
};