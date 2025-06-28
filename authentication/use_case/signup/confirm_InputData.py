# # File: authentication/use_case/signup/confirm_InputData.py
class ConfirmInputData:
    def __init__(self, email: str, confirmationcode):
        self.email = email
        self.confirmationcode = confirmationcode

    def get_email(self) -> str:
        return self.email
    
    def get_confrimationcode(self):
        return self.confirmationcode