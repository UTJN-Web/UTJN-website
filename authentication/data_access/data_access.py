import argparse
import base64
import logging
import os
from pprint import pp
import sys
import webbrowser

import boto3
import qrcode
from pycognito import aws_srp

from cognito_idp_actions import CognitoIdentityProviderWrapper

def signup_user(str: email, str: password):
    if verifyemail(email) == False:
        return False

    cog_wrapper = CognitoIdentityProviderWrapper(
        cognito_idp_client, user_pool_id, client_id
    )

    confirmed = cog_wrapper.sign_up_user(user_name, password, email)


def verifyemail(str: email) -> bool:
    if email.endswith("@mail.utoronto.ca"):
        return True
    else:   
        return False
