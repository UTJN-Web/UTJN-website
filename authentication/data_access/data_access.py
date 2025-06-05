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

def signup_user(email, password, password2):
    
    if verifyemail(email) == False:
        print("Invalid email address. Please use a @mail.utoronto.ca email.")
        return False
    
    if password != password2:
        print("Passwords do not match. Please try again.")
        return False

    # Ad  cognito secret access key
    cog_wrapper = CognitoIdentityProviderWrapper()

    confirmed = cog_wrapper.sign_up_user(email, password, email)

    print(confirmed)
    return confirmed


def verifyemail(email) -> bool:
    if email.endswith("@mail.utoronto.ca"):
        return True
    else:   
        return False
    
def confirm_user(email, code):
    cog_wrapper = CognitoIdentityProviderWrapper()

    confirmed = cog_wrapper.confirm_user_sign_up(email, code)
    return confirmed

def resend_confirmation(email):
    cog_wrapper = CognitoIdentityProviderWrapper()
    delivery = cog_wrapper.resend_confirmation(email)
    if delivery is None:
        print(f"No confirmation delivery found for {email}.")
        return False
    print(
        f"Confirmation code sent by {delivery['DeliveryMedium']} "
        f"to {delivery['Destination']}."
    )
    return True

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
    response = cog_wrapper.call_admin_get_user(email)
    if response is None:
        print(f"User {email} not found.")
        return None
    userattribute = response.get("UserAttributes", {})
    value = next(d['Value'] for d in userattribute if d['Name'] == 'sub')
    return value

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
