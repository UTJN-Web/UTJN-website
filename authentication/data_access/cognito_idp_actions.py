"""
Purpose

Contains functions that directly interacts with the AWS Cognito API using the Cognito Identity Provider.
Details for each function can be found here: https://boto3.amazonaws.com/v1/documentation/api/latest/index.html
"""

import base64
import hashlib
import hmac
import logging
import os
import boto3
from botocore.exceptions import ClientError
from pathlib import Path
from dotenv import load_dotenv
from authentication.config import get_settings

logger = logging.getLogger(__name__)

# Define custom errors
class UsernameExistsError(Exception):
    """Raised when the user already exists in the user pool."""
    pass

class InvalidPasswordError(Exception):
    """Raised when the password does not meet the requirements for signup."""
    pass

class ExpiredCodeError(Exception):
    """Raised when the confirmatrion code used for sign up has expired."""
    pass

class TooManyFailedAttemptsError(Exception):
    """Raised when the user has made too many failed attempts to confirm sign up."""
    pass

class IncorrectCodeError(Exception):
    """Raised when the confirmation code used for sign up is incorrect."""
    pass

class EmailNotFoundError(Exception):
    """Raised when the email adress a user enetered for login is not found."""
    pass

class UserNotConfirmedError(Exception):
    """Raised when the user is not confirmed yet."""
    pass

class IncorrectParameterError(Exception): 
    """Raised when the user enters an incorrect parameter for login, such as an incorrect email or password."""
    pass

class PasswordSameError(Exception):
    """Raised when the password a user has enetered as their new password is the same as their old password"""
    pass

# snippet-start:[python.example_code.cognito-idp.CognitoIdentityProviderWrapper.full]
# snippet-start:[python.example_code.cognito-idp.helper.CognitoIdentityProviderWrapper.decl]
class CognitoIdentityProviderWrapper:
    """An instance of the Cognito-idp. Encapsulates Amazon Cognito actions"""

    def __init__(self, client_secret=None):
        """
        :param cognito_idp_client: A Boto3 Amazon Cognito Identity Provider client.
        :param user_pool_id: The ID of an existing Amazon Cognito user pool.
        :param client_id: The ID of a client application registered with the user pool.
        :param client_secret: The client secret, if the client has a secret.
        """
        #env_path = Path(__file__).resolve().parents[2] / ".env"
        #load_dotenv(dotenv_path=env_path)

        #user_pool_id = os.getenv("COGNITO_POOL_ID")
        #client_id = os.getenv("COGNITO_CLIENT_ID")
        #region = os.getenv("COGNITO_REGION")
        #cognito_idp_client = boto3.client("cognito-idp", region_name=region, 
        #                                  aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"), aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"))

        #self.cognito_idp_client = cognito_idp_client
        #self.user_pool_id = user_pool_id
        #self.client_id = client_id
        #self.client_secret = client_secret

        settings = get_settings()
        self.user_pool_id = settings.pool_id
        self.client_id = settings.client_id
        self.client_secret = settings.client_secret
        cognito_idp_client = boto3.client("cognito-idp", region_name=settings.region, 
                                               aws_access_key_id=settings.aws_access_key, aws_secret_access_key=settings.aws_secret_key)
        self.cognito_idp_client = cognito_idp_client

    # snippet-end:[python.example_code.cognito-idp.helper.CognitoIdentityProviderWrapper.decl]

    def _secret_hash(self, user_name):
        """
        Calculates a secret hash from a user name and a client secret.

        :param user_name: The user name to use when calculating the hash.
        :return: The secret hash.
        """
        key = self.client_secret.encode()
        msg = bytes(user_name + self.client_id, "utf-8")
        secret_hash = base64.b64encode(
            hmac.new(key, msg, digestmod=hashlib.sha256).digest()
        ).decode()
        logger.info("Made secret hash for %s: %s.", user_name, secret_hash)
        return secret_hash

    # snippet-start:[python.example_code.cognito-idp.SignUp]
    def sign_up_user(self, user_name, password, user_email):
        """
        Attempts to sign up a user. Returns True only if the user was just added.
        Returns False if the user already exists (regardless of confirmation).
        Raises if any other error occurs.

        :param user_name: The user name that identifies the new user.
        :param password: The password for the new user.
        :param user_email: The email address for the new user.
        :return: True when the user was able to sign up.
        """
        try:
            kwargs = {
                "ClientId": self.client_id,
                "Username": user_name,
                "Password": password,
                "UserAttributes": [{"Name": "email", "Value": user_email}],
            }
            if self.client_secret is not None:
                kwargs["SecretHash"] = self._secret_hash(user_name)

            # Attempt to sign up (Cognito sends verification email automatically)
            response = self.cognito_idp_client.sign_up(**kwargs)
            #print(response)

            # If we reached here, the user was just created
            return True

        # Raise errors as necessary
        except ClientError as err:
            error_code = err.response["Error"]["Code"]

            if error_code == "UsernameExistsException":
                # User already exists, so not a new sign-up
                logger.warning("User %s already exists in user pool.", user_name)
                raise UsernameExistsError("The username already exists.")
            
            if error_code == "InvalidPasswordException":
                # Password doesn't meet the requirements
                raise InvalidPasswordError("The password does not meet the requirements.")

            # Any other unexpected error → re-raise
            logger.error(
                "Couldn't sign up %s. Here's why: %s: %s",
                user_name,
                error_code,
                err.response["Error"]["Message"],
            )
            return False

    # snippet-end:[python.example_code.cognito-idp.SignUp]

    # snippet-start:[python.example_code.cognito-idp.ResendConfirmationCode]
    def resend_confirmation(self, user_name):
        """
        Prompts Amazon Cognito to resend an email with a new confirmation code.

        :param user_name: The name of the user who will receive the email.
        :return: Delivery information about where the email is sent.
        """
        try:
            kwargs = {"ClientId": self.client_id, "Username": user_name}
            if self.client_secret is not None:
                kwargs["SecretHash"] = self._secret_hash(user_name)
            response = self.cognito_idp_client.resend_confirmation_code(**kwargs)
            delivery = response["CodeDeliveryDetails"]
        except ClientError as err:
            logger.error(
                "Couldn't resend confirmation to %s. Here's why: %s: %s",
                user_name,
                err.response["Error"]["Code"],
                err.response["Error"]["Message"],
            )
            return None
        else:
            return delivery

    # snippet-end:[python.example_code.cognito-idp.ResendConfirmationCode]

    # snippet-start:[python.example_code.cognito-idp.ConfirmSignUp]
    def confirm_user_sign_up(self, user_name, confirmation_code):
        """
        Confirms a previously created user. A user must be confirmed before they
        can sign in to Amazon Cognito.

        :param user_name: The name of the user to confirm.
        :param confirmation_code: The confirmation code sent to the user's registered
                                  email address.
        :return: True when the confirmation succeeds.
        """
        try:
            kwargs = {
                "ClientId": self.client_id,
                "Username": user_name,
                "ConfirmationCode": confirmation_code,
            }
            if self.client_secret is not None:
                kwargs["SecretHash"] = self._secret_hash(user_name)
            self.cognito_idp_client.confirm_sign_up(**kwargs)
        except ClientError as err:
            error_code = err.response["Error"]["Code"]

            if error_code == "ExpiredCodeException":
                raise ExpiredCodeError
            
            elif error_code == "TooManyFailedAttemptsException":
                raise TooManyFailedAttemptsError
            
            elif error_code == "CodeMismatchException":
                raise IncorrectCodeError

            logger.error(
                "Couldn't confirm sign up for %s. Here's why: %s: %s",
                user_name,
                err.response["Error"]["Code"],
                err.response["Error"]["Message"],
            )
            raise
        else:
            return True

    # snippet-end:[python.example_code.cognito-idp.ConfirmSignUp]

    # snippet-start:[python.example_code.cognito-idp.AdminGetUser]
    def admin_get_user(self, user_name):
        """
        Calls the Cognito AdminGetUser API to retrieve user information.

        :param user_name: The name of the user to retrieve.
        :return: The response from the AdminGetUser API call.
        """
        try:
            response = self.cognito_idp_client.admin_get_user(
                UserPoolId=self.user_pool_id, Username=user_name
            )
        except ClientError as err:
            logger.error(
                "Couldn't get user %s. Here's why: %s: %s",
                user_name,
                err.response["Error"]["Code"],
                err.response["Error"]["Message"],
            )
            return None
        else:
            return response
    # snippet-end:[python.example_code.cognito-idp.AdminGetUser]

    def initiate_auth(self, email: str, password: str):
       """
       Attempts to log in a user using the given email and password via AWS Cognito.


       :returns: True if authentication is successful, False otherwise.


       This method calls the 'USER_PASSWORD_AUTH' flow in Cognito.
       If login fails due to known issues (e.g. incorrect credentials, user not confirmed, etc.),
       appropriate error messages are printed and False is returned.
       """
       try:
           auth_params = {
               "USERNAME": email,
               "PASSWORD": password,
           }
           if self.client_secret is not None:
               auth_params["SECRET_HASH"] = self._secret_hash(email)


           response = self.cognito_idp_client.initiate_auth(
               ClientId=self.client_id,
               AuthFlow="USER_PASSWORD_AUTH",
               AuthParameters=auth_params,
           )
           return True


       except ClientError as err:
            error_code = err.response["Error"]["Code"]
            if error_code == "UserNotFoundException":
                # User is not found, so email adress is incorrect
                raise EmailNotFoundError("This email does not exist.")

            if error_code == "UserNotConfirmedException":
                raise UserNotConfirmedError()
            
            if error_code == "NotAuthorizedException":
                raise IncorrectParameterError("The email or password you entered is incorrect.")
           
            # Any other unexpected error → re-raise
            logger.error(
               "Couldn't sign up %s. Here's why: %s: %s",
               email,
               error_code,
               err.response["Error"]["Message"],
            )
            raise 
       
    def forgot_password(self, email: str):
        """
        Initiates the password reset process for a user by sending a verification code to their email.

        :param email: The email address of the user who wants to reset their password.
        :return: True if the request was successful, False otherwise.
        """
        try:
            kwargs = {
                "ClientId": self.client_id,
                "Username": email,
            }
            if self.client_secret is not None:
                kwargs["SecretHash"] = self._secret_hash(email)
            self.cognito_idp_client.forgot_password(**kwargs)
            return True
        except ClientError as err:
            error_code = err.response["Error"]["Code"]
            if error_code == "UserNotFoundException":
                # User is not found, so email adress is incorrect
                raise EmailNotFoundError("This email does not exist.")
            raise
        
    def confirm_forgot_password(self, email: str, confirmation_code: str, new_password: str):
        """
        Confirms the new password for a user after they have received a verification code.

        :param email: The email address of the user who is resetting their password.
        :param confirmation_code: The verification code sent to the user's email.
        :param new_password: The new password to set for the user.
        :return: True if the password was successfully changed, False otherwise.
        """
        try:
            kwargs = {
                "ClientId": self.client_id,
                "Username": email,
                "ConfirmationCode": confirmation_code,
                "Password": new_password,
            }
            if self.client_secret is not None:
                kwargs["SecretHash"] = self._secret_hash(email)
            self.cognito_idp_client.confirm_forgot_password(**kwargs)
            return True
        
        except ClientError as err:
            error_code = err.response["Error"]["Code"]

            if error_code == "CodeMismatchException":
                # The code does not match.
                raise IncorrectCodeError("The code does not match")
            
            if error_code == "ExpiredCodeException":
                # The code has expired, so generate a new code.
                raise ExpiredCodeError
            
            if error_code == "InvalidPasswordException":
                # The password does not match the requirements. Prompt the user to add the valid password
                raise InvalidPasswordError
            
            if error_code == "PasswordHistoryPolicyViolationException":
                # The password is the same as what the user had before. Ask the user to enter a new password
                raise PasswordSameError
            
            if error_code == "UserNotConfirmedException":
                # The user is not confirmed yet. Promt the user to their respective signin state
                raise UserNotConfirmedError
            
            if error_code == "TooManyFailedAttemptsException":
                # The user has failed their reset process too many times. Ask them to start a new one later.
                raise TooManyFailedAttemptsError

            raise