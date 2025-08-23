## authentication/display_strings.py

# This file defines various kinds of strings for the authentication module.
# Many of the strings will be displayed on screen as an error message on an unsuccesful authentication flow
# or as a success message on a successful authentication flow.

GENERAL_ERROR = "An unexpected error occurred. Please try again later."

# ─── Signup Related Errors ────────────────────────────────────────────────────────
INVALID_EMAIL = "Invalid email address. Please use a @mail.utoronto.ca email."
PASSWORD_MISMATCH = "Passwords do not match. Please try again."
USER_ALREADY_CONFIRMED = "This user has already been confirmed. Proceed to Log In."
USER_UNCONFIRMED = "You are not confirmed yet. A confirmation code has been re-sent to your email."
INVALID_PASSWORD = "Password does not meet the requirements.\n Please try a new password."

# ─── Confirm Signup Related Errors ────────────────────────────────────────────────────────
INVALID_CONFIRMATION_CODE = "Invalid confirmation code. Please try again."
CONFIRMATION_CODE_EXPIRED = "The code you enetered has expired. A new confirmation code has been re-sent to your email. Please try again"
TOO_MANY_FAILED_ATTEMPTS = "Too many failed attempts. Please try again later."
INCORRECT_CONFIRMATION_CODE = "The confirmation code you entered is incorrect. Please try again."

# ─── Login Related Errors ─────────────────────────────────────────────────────────
LOGIN_INVALID_EMAIL = "The email you entered is not found. Please try again."
LOGIN_UNSUCCESSFUL = "Login unsuccessful. Please try again."
INVALID_PARAMETER = "One of the information you entered is incorrect. Please try again."

# ─── Confirm Forgot Password Related Errors ────────────────────────────────────────────────────────
VERIFICATION_CODE_EXPIRED = "The code you enetered has expired. A new verification code has been re-sent to your email. Please try again."
RSP_PASSWORD_MISMATCH = "Passwords do not match. Please try again."
PASSWORD_SAME = "The new password you entered is the same as your old password. Please choose a different password from before."
RSP_TOO_MANY_FAILED_ATTEMPTS = "Too many failed attempts. Please try again later."
RSP_USER_UNCONFIRMED = "You are not confirmed yet. Please complete your sign in process first."
INCORRECT_VERFICATION_CODE = "The verification code you entered is incorrect. Please try again."