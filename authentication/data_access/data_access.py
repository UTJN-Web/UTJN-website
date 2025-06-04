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

    args = parser.parse_args()

    if args.cmd == "signup":
        ok = signup_user(args.email, args.pw)
        print("Signup OK?", ok)

    elif args.cmd == "confirm":
        ok = confirm_user(args.email, args.code)
        print("Confirmed?", ok)
