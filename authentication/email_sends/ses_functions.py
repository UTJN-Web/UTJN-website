import os
import re
import html
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from authentication.config import get_settings

_EMAIL_RE = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$"
)

def get_ses():
    """
    Returns an instande of sesv2.
    """
    settings = get_settings()

    return boto3.client("sesv2", region_name=settings.region, aws_access_key_id=settings.aws_access_key, aws_secret_access_key=settings.aws_secret_key)

def check_email(email: str) -> bool:
    """
    Returns True if 'email' looks like a valid RFC-like address (basic syntax check).
    For stricter validation use the 'email-validator' package.
    """
    if not isinstance(email, str):
        return False
    email = email.strip()
    if not (1 <= len(email) <= 254):
        return False
    return bool(_EMAIL_RE.match(email))

def send_contact_form(name: str, email: str, body: str) -> Optional[str]:
    """
    Sends a contact-form message to uoftjn@gmail.com inbox via Amazon SES.
    Also sends a reply to the organization to confirm that their message has been sent.
    
    For the reply back to the organization, they can send a reply back to the given email and their rpely will be
    sent back to utjnit@gmail.com and uoftjn@gmail.com

    - name: the name of the person who filled in the contact form
    - email: the email of the contacter
    - body: message filled in by the contacter

    Returns a tuple containing
    - bool: indicate whether the process was succesful or not
    - str: message to indicate the type of failure (or a success message.)
    """
    # --- Validate inputs ---
    name = (name or "").strip()
    body = (body or "").strip()
    if not check_email(email):
        return (False, "Please enter a valid email adress")
    if not body:
        return (False, "Message body can not be empty.")
    if len(body) > 5000:
        return (False, "Message body too long (max 5000 characters).")

    # --- Compose content for message to be sent to UTJN---
    subject = f"UTJN request form submission from {name or email}"
    text_body = f"From: {name} <{email}>\n\n{body}"
    html_body = f"""
    <html><body>
      <p><strong>From:</strong> {html.escape(name)} &lt;{html.escape(email)}&gt;</p>
      <hr/>
      <pre style="white-space:pre-wrap;margin:0">{html.escape(body)}</pre>
    </body></html>
    """

    # Get the ses
    ses = get_ses()

    # --- Send via SES v2 ---
    try:
        to_utjn = ses.send_email(
            FromEmailAddress="test-noreply@uoftjn.com",
            Destination={"ToAddresses": ["utjnit@gmail.com"]},
            ReplyToAddresses=[email],
            Content={
                "Simple": {
                    "Subject": {"Data": subject},
                    "Body": {
                        "Text": {"Data": text_body},
                        "Html": {"Data": html_body},
                    },
                }
            },
        )

        # Compose mail that will be sent back to the contacter
        to_contacter_subject = "We received your message — UTJN"
        to_contacter_text = (
            "Hi {name},\n\nThanks for reaching out! We’ve received your message and "
            "someone from UTJN will get back to you soon.\n\n"
            "— Copy of your message —\n{body}\n\n"
            "If you didn’t submit this, please reply to this email to let us know."
        ).format(name=(name or "there"), body=body)

        safe_body = html.escape(body).replace("\n", "<br/>")

        to_contacter_html = f"""
        <html><body>
          <p>Hi {html.escape(name) if name else "there"},</p>
          <p>Thanks for reaching out! We've received your message and someone from UTJN will get back to you soon.</p>
          <p><em>Copy of your message:</em></p>
          <blockquote style="border-left:3px solid #ccc;padding-left:10px">
            {safe_body}
          </blockquote>
          <p>If you didn’t submit this, please reply to this email to let us know.</p>
        </body></html>
        """

        # Send request via AWS SES v2
        to_contacter = ses.send_email(
            FromEmailAddress="test-noreply@uoftjn.com",
            Destination={"ToAddresses": [email]},
            ReplyToAddresses=["utjnit@gmail.com"],
            Content={
                "Simple": {
                    "Subject": {"Data": to_contacter_subject},
                    "Body": {
                        "Text": {"Data": to_contacter_text},
                        "Html": {"Data": to_contacter_html},
                    },
                }
            },
        )
        return (True, "Message has been successfully sent. A confirmation email will be sent to your email shortly.")
    
    except ClientError as e:
        # Common pitfalls:
        # - Still in SES sandbox (can only send to verified recipients)
        # - From address/domain not verified
        # - Region mismatch
        return (False, "An error occurred while trying to send the contact form. Please try again later.")

# Example usage
if __name__ == "__main__":
    mid = send_contact_form(
        name="Kenta",
        email="kfploch@gmail.com",
        body="Testing"
    )
    print("Reponse:", mid[1])