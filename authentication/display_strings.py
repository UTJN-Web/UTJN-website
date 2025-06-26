# This file defines various kinds of strings for the authentication module.
# Many of the strings will be displayed on screen as an error message on an unsuccesful authentication flow
# or as a success message on a successful authentication flow.

GENERAL_ERROR = "An unexpected error occurred. Please try again later."

# ─── Signup Related Errors ────────────────────────────────────────────────────────
INVALID_EMAIL = "Invalid email address. Please use a @mail.utoronto.ca email."
PASSWORD_MISMATCH = "Passwords do not match. Please try again."
USER_ALREADY_CONFIRMED = "This user has already been confirmed. Proceed to Log In."
USER_UNCONFIRMED = "You are not confirmed yet. A confirmation code has been re-sent to your email."

# ─── Confirm Signup Related Errors ────────────────────────────────────────────────────────
INVALID_CONFIRMATION_CODE = "Invalid confirmation code. Please try again."
CONFIRMATION_CODE_EXPIRED = "The code you enetered has expired. A new confirmation code has been re-sent to your email. Please try again"
TOO_MANY_FAILED_ATTEMPTS = "Too many failed attempts. Please try again later."
INCORRECT_CONFIRMATION_CODE = "The confirmation code you entered is incorrect. Please try again."

# ─── Login Related Errors ─────────────────────────────────────────────────────────