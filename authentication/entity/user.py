from dataclasses import dataclass, field
from typing import Any, Dict


class Login_User:
    email: str
    token: str = field(default="")
    # The token is optional and defaults to an empty string.
    def __init__(self, username: str, password: str, email: str, token: str = ""):
        self.email = email
        self.token = token