# # File: authentication/use_case/signup/signup_OutputData.py

class SignupOutputData:
    def __init__(self, success: bool, message: str):
        self.success = success
        self.message = message

    def is_success(self) -> bool:
        return self.success
    
    def get_message(self) -> str:
        return self.message