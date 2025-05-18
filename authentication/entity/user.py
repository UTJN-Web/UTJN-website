from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class User:
    password: str
    email: str
    token: str = field(default="")
    # The token is optional and defaults to an empty string.


    def __init__(self, password: str, email: str, token: str = ""):
        self.password = password
        self.email = email
        self.token = token