# authentication/data_access/data_access.py
import argparse
import base64
import logging
import os
from pprint import pp
import sys
import webbrowser
import boto3
from pycognito import aws_srp
from authentication.data_access.cognito_idp_actions import CognitoIdentityProviderWrapper
from authentication.data_access.cognito_idp_actions import UsernameExistsError, InvalidPasswordError, ExpiredCodeError, TooManyFailedAttemptsError, IncorrectCodeError, EmailNotFoundError, UserNotConfirmedError, IncorrectParameterError
from authentication import display_strings as ds

def signup_user(email, password, password2):
    """
    Function to sign up a user with email and password.
    Args:
        email (str): The user's email address.
        password (str): The user's password.
        password2 (str): Confirmation of the user's password.z
    Returns:
        A tuple containing...
        - bool: True if the user is successfully signed up, False otherwise.
        - string: A message indicating the result of the sign-up process.
    """
    # Check if the email is valid a uoft email (REMOVED BY REQUEST)
    #if verifyemail(email) == False:
    #    return (False, ds.INVALID_EMAIL)
    
    # Check if the password matches
    if password != password2:
        return (False, ds.PASSWORD_MISMATCH)
    
    # Check if password is strong enough

    # Initialize the CognitoIdentityProviderWrapper to call the aws related functions.
    cog_wrapper = CognitoIdentityProviderWrapper()

    # Call the sign up function
    try:
        # Call the boto3 function that signs up the user
        confirmed = cog_wrapper.sign_up_user(email, password, email)

        if confirmed:
            return (confirmed, "SUCCESS")
        else:
            return (confirmed, "Unexpected Error occurred: Signup Failed")
    
    # If user name exists, check if the user has been verified
    except UsernameExistsError:
        response = call_admin_get_user(email)
        # If the user exists and is confirmed, proceed user to login
        if response and response.get("UserStatus") == "CONFIRMED":
            print(ds.USER_ALREADY_CONFIRMED)
            return (False, ds.USER_ALREADY_CONFIRMED)
        else: # The user exists but is uncofirmed. Resend verification code
            resend_confirmation(email) # MAKE SURE TO CHECK FOR ANY ERRORS
            print(ds.USER_UNCONFIRMED)
            return (False, ds.USER_UNCONFIRMED)
    
    except InvalidPasswordError:
        # If the password is invalid, return False with an error message indicating that password doesn't meet requirements
        return (False, ds.INVALID_PASSWORD)
    
    # For any other exception, return False
    except Exception as e:
        return (False, ds.GENERAL_ERROR)


async def login_user(email, password) -> tuple:
    """
    Function to log in a user with email and password.
    Args:
        email (str): The user's email address.
        password (str): The user's password.
    Returns:
        A tuple containing...
        - bool: True if the user was successfully able to log in, False otherwise.
        - string: A message indicating the result of the log-in process.
        - dict: User information if login is successful, None otherwise.
    """
    # Initialize the CognitoIdentityProviderWrapper to call the aws related functions.
    cog_wrapper = CognitoIdentityProviderWrapper()

    # Call the login function
    try:
        # Call the boto3 function that logs in the user
        login_confirmed = cog_wrapper.initiate_auth(email, password)
        if login_confirmed:
            # Get user information from Cognito
            user_info = call_admin_get_user(email)
            user_data = {
                "email": email,
                "name": email.split('@')[0]  # Use email prefix as name for now
            }
            if user_info and user_info.get("UserAttributes"):
                for attr in user_info["UserAttributes"]:
                    if attr["Name"] == "name":
                        user_data["name"] = attr["Value"]
                        break
            
            # Try to get additional user data from database
            try:
                from authentication.data_access.user_repository import UserRepository
                user_repo = UserRepository()
                await user_repo.connect()
                
                db_user = await user_repo.get_user_by_email(email)
                if db_user:
                    # Merge database data with Cognito data
                    user_data.update({
                        "id": db_user["id"],
                        "firstName": db_user["firstName"],
                        "lastName": db_user["lastName"],
                        "major": db_user["major"],
                        "graduationYear": db_user["graduationYear"],
                        "cognitoSub": db_user["cognitoSub"],
                        "joinedAt": db_user["joinedAt"].isoformat() if db_user["joinedAt"] else None,
                        "hasProfile": True
                    })
                else:
                    user_data["hasProfile"] = False
                
                await user_repo.disconnect()
            except Exception as db_error:
                print(f"Warning: Could not retrieve database user data: {db_error}")
                user_data["hasProfile"] = False
            
            return (True, "Login successful.", user_data)
        else:
            return (False, ds.LOGIN_UNSUCCESSFUL, None)
    
    except EmailNotFoundError:
        return (False, ds.LOGIN_INVALID_EMAIL, None)
    
    except UserNotConfirmedError:
        return (False, ds.USER_UNCONFIRMED, None)
    
    except IncorrectParameterError:
        return (False, ds.LOGIN_INVALID_EMAIL, None)

    except Exception as e:
        print(f"Login error: {e}")
        return (False, ds.GENERAL_ERROR, None)


def verifyemail(email) -> bool:
    """
    Helper function to verify if the email is a valid uoft email.
    """
    if email.endswith("@mail.utoronto.ca"):
        return True
    else:   
        return False


def confirm_user(email, code):
    """
    Function to confirm user sign up with email and confirmation code.
    Args:
        email (str): The user's email address.
        code (str): The confirmation code sent to the user's email.
    Returns:
        A tuple containing...
        - bool: True if the user is successfully signed up, False otherwise.
        - string: A message indicating the result of the sign-up process.
    """
    cog_wrapper = CognitoIdentityProviderWrapper()
    try:
        confirmed = cog_wrapper.confirm_user_sign_up(email, code)
        if confirmed:
            return (confirmed, "SUCCESS")
        else:
            return (confirmed, ds.GENERAL_ERROR)
    
    except ExpiredCodeError:
        resend_confirmation(email)
        return (False, ds.CONFIRMATION_CODE_EXPIRED)
    
    except TooManyFailedAttemptsError:
        return (False, ds.TOO_MANY_FAILED_ATTEMPTS)
    
    except IncorrectCodeError:
        return (False, ds.INVALID_CONFIRMATION_CODE)

    except Exception as e:
        return (False, ds.GENERAL_ERROR)  

def resend_confirmation(email):
    """
    Resends the confirmation code to the user's email.
    Args:
        email (str): The user's email address.
    Returns:
        bool: True if the confirmation code is successfully resent, False otherwise.
    """
    cog_wrapper = CognitoIdentityProviderWrapper()

    # Call the boto3 function that resends confirmation
    delivery = cog_wrapper.resend_confirmation(email)
    if delivery is None: # Return False on failure
        print(f"No confirmation delivery found for {email}.")
        return False
    
    # Print the delivery information (Delete this later)
    print(
        f"Confirmation code sent by {delivery['DeliveryMedium']} "
        f"to {delivery['Destination']}."
    )
    return True # Success once code reaches here


def call_admin_get_user(email):
    """
    Calls the Cognito AdminGetUser API to retrieve user information.
    """
    cog_wrapper = CognitoIdentityProviderWrapper()
    response = cog_wrapper.admin_get_user(email)
    if response is None:
        print(f"User {email} not found.")
        return None
    return response
    

def get_user_sub(email):
    """
    Retrieves the Cognito UUID (sub) for a given email.
    """
    cog_wrapper = CognitoIdentityProviderWrapper()

    # Call admin_get_user to get user attributes
    response = cog_wrapper.admin_get_user(email)
    if response is None:
        print(f"User {email} not found.")
        return None
    
    # Extract the 'sub' attribute from the response
    userattribute = response.get("UserAttributes", {})
    try:
        user_sub = next(d['Value'] for d in userattribute if d['Name'] == 'sub')
        return user_sub
    except StopIteration:
        print(f"Sub attribute not found for user {email}")
        return None

if __name__ == "__main__":
    import argparse, asyncio

    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    # signup
    p1 = sub.add_parser("signup")
    p1.add_argument("--email", required=True)
    p1.add_argument("--pw",    required=True)
    p1.add_argument("--pw2",    required=True)

    # confirm
    p2 = sub.add_parser("confirm")
    p2.add_argument("--email", required=True)
    p2.add_argument("--code",  required=True)

    # resend confirmation
    p3 = sub.add_parser("resend")
    p3.add_argument("--email", required=True)

    # admin get user
    p4 = sub.add_parser("admin_get_user")
    p4.add_argument("--email", required=True)

    # login
    p5 = sub.add_parser("login")
    p5.add_argument("--email", required=True)
    p5.add_argument("--pw", required=True)



    args = parser.parse_args()

    if args.cmd == "signup":
        ok = signup_user(args.email, args.pw, args.pw2)
        print("Signup OK?", ok)

    elif args.cmd == "confirm":
        ok = confirm_user(args.email, args.code)
        print("Confirmed?", ok)

    elif args.cmd == "resend":
        delivery = resend_confirmation(args.email)
        print("Resend confirmation delivery:", delivery)

    elif args.cmd == "admin_get_user": 
        user_info = call_admin_get_user(args.email)
        print(user_info)

    elif args.cmd == "login":
        ok = login_user(args.email, args.pw)
        print("Login OK?", ok) 