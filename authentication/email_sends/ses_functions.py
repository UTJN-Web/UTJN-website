import os
import re
import html
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from authentication.config import get_settings
from datetime import datetime
from zoneinfo import ZoneInfo

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
        return (False, "An error occurred while trying to send the contact form. Please try again later.")
    
def send_receipt(email: str, event_name: str, date: str):
    """
    A function that sends a receipt confirming that they have purchased the ticket for 
    the event with event_name happening on the given date.
    """
    ses = get_ses()

    if not check_email(email):
        return (False, "Please enter a valid email adress")

    # --- current time in Eastern Time (handles EST/EDT automatically) ---
    now_et = datetime.now(ZoneInfo("America/Toronto"))
    stamped = now_et.strftime("%Y-%m-%d %H:%M %Z")

    # --- compose content (escape for HTML) ---
    ev_html  = html.escape(event_name)
    date_html = html.escape(date)
    time_html = html.escape(stamped)

    subject = f"Your Ticket Receipt — {event_name}"
    text_body = (
        "Thank you for your purchase!\n\n"
        f"Event: {event_name}\n"
        f"Date: {date}\n"
        f"Confirmed at: {stamped} (Eastern Time)\n\n"
        "If you have not purchased this event, please reply to this email."
    )
    html_body = f"""
    <html><body style="font-family:Arial,Helvetica,sans-serif">
      <h2 style="margin:0 0 12px 0">Thank you for your purchase!</h2>
      <p style="margin:0 0 16px 0">This email confirms your ticket.</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 8px"><strong>Event</strong></td><td style="padding:4px 8px">{ev_html}</td></tr>
        <tr><td style="padding:4px 8px"><strong>Date</strong></td><td style="padding:4px 8px">{date_html}</td></tr>
        <tr><td style="padding:4px 8px"><strong>Confirmed at</strong></td><td style="padding:4px 8px">{time_html} (Eastern Time)</td></tr>
      </table>
      <p style="margin-top:16px">If you have not purchased this event, please reply to this email.</p>
    </body></html>
    """

    # --- send via SESv2 ---
    try:
        resp = ses.send_email(
            FromEmailAddress="test-noreply@uoftjn.com",
            Destination={"ToAddresses": [email]},
            ReplyToAddresses=(["utjnit@gmail.com"]), #Add utjn and utjnit just in case
            Content={
                "Simple": {
                    "Subject": {"Data": subject},
                    "Body": {
                        "Text": {"Data": text_body},
                        "Html": {"Data": html_body},
                    },
                }
            },
            EmailTags=[
                {"Name": "type", "Value": "receipt"}
            ],
        )
        return (True, "Receipt has been sent.")
    except ClientError:
        raise(False, "There has been an error while trying to send the receipt")

# Example usage
if __name__ == "__main__":
    #mid = send_contact_form(
    #    name="Kenta",
    #    email="kfploch@gmail.com",
    #    body="Testing"
    #)
    #print("Reponse:", mid[1])

    mid = send_receipt(
        email = "kfploch@gmail.com",
        event_name = "Halloween Party",
        date = "August 2025, 2022"
    )
    print(mid[1])