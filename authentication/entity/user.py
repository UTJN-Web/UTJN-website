from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class User:
    username: str
    password: str
    email: str
    token: str = field(default="")
    # The token is optional and defaults to an empty string.

