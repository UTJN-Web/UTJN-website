# app/authentication/use_case/signup/signup_InputData.py

class SignupInputData:
    def __init__(self, email: str, password1: str, password2: str):
        self.email = email
        self.password1 = password1
        self.password2 = password2

    def get_email(self) -> str:
        return self.email
    
    def get_password1(self) -> str:
        return self.password1
    
    def get_password2(self) -> str:
        return self.password2