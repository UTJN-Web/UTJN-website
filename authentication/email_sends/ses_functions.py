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
            FromEmailAddress="noreply@uoftjn.com",
            Destination={"ToAddresses": ["uoftjn@gmail.com"]},
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

        # Compose mail that will be sent back to the sender
        to_contacter_subject = "We received your message — UTJN"

        ja_name = f"{name} 様" if name else "お客さま"
        ja_text = (
            f"{ja_name}\n\n"
            "この度はお問い合わせいただきありがとうございます。\n"
            "担当者よりご連絡をいたしますので、今しばらくお待ちください。\n\n"
            "— お問い合わせ内容 —\n"
            f"{body}\n\n"
            "もしお心当たりがない場合は、本メールに直接ご返信いただけますと幸いです。\n"
        )

        en_text = (
            "Hi {name},\n\nThanks for reaching out! We’ve received your message and "
            "someone from UTJN will get back to you soon.\n\n"
            "— Copy of your message —\n{body}\n\n"
            "If you didn’t submit this, please reply to this email to let us know."
        ).format(name=(name or "there"), body=body)

        to_contacter_text = ja_text + ("-" * 40) + "\n" + en_text

        safe_body = "<br/>".join(html.escape(body).splitlines())
        safe_name = html.escape(name) + " 様" if name else "お客さま"

        to_contacter_html = f"""
        <html lang="ja"><body style="font-family:Arial,Helvetica,'Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif">
          <p>{safe_name}</p>
          <p>この度はお問い合わせいただきありがとうございます。<br/>
             担当者よりご連絡をいたしますので、今しばらくお待ちください。</p>
          <p><em>— お問い合わせ内容 —</em></p>
          <blockquote style="border-left:3px solid #ccc;padding-left:10px">{safe_body}</blockquote>
          <p>もしお心当たりがない場合は、本メールに直接ご返信いただけますと幸いです。</p>

          <hr style="margin:20px 0"/>

          <p>Hi {html.escape(name) if name else "there"},</p>
          <p>Thanks for reaching out! We've received your message and someone from UTJN will get back to you soon.</p>
          <p><em>— Copy of your message —</em></p>
          <blockquote style="border-left:3px solid #ccc;padding-left:10px">{safe_body}</blockquote>
          <p>If you didn’t submit this, please reply to this email to let us know.</p>
        </body></html>
        """

        # Send request via AWS SES v2
        to_contacter = ses.send_email(
            FromEmailAddress="noreply@uoftjn.com",
            Destination={"ToAddresses": [email]},
            ReplyToAddresses=["utjnit@gmail.com"],
            Content={
                "Simple": {
                    "Subject": {"Data": to_contacter_subject, "Charset": "UTF-8"},
                    "Body": {
                        "Text": {"Data": to_contacter_text, "Charset": "UTF-8"},
                        "Html": {"Data": to_contacter_html, "Charset": "UTF-8"},
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
            FromEmailAddress="noreply@uoftjn.com",
            Destination={"ToAddresses": [email]},
            ReplyToAddresses=(["utjnit@gmail.com", "uoftjn@gmail.com"]),
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

def send_refund_notification(email: str, event_name: str, amount: float, currency: str, status: str, adminNotes: str):
    """
    A function that sends a refund notification email to inform users about their refund status.
    """
    ses = get_ses()

    if not check_email(email):
        return (False, "Please enter a valid email address")

    # --- current time in Eastern Time (handles EST/EDT automatically) ---
    now_et = datetime.now(ZoneInfo("America/Toronto"))
    stamped = now_et.strftime("%Y-%m-%d %H:%M %Z")

    # --- compose content (escape for HTML) ---
    ev_html = html.escape(event_name)
    amount_html = html.escape(f"{currency} {amount:.2f}")
    status_html = html.escape(status.title())
    notes_html = html.escape(adminNotes) if adminNotes else "No additional notes provided."
    time_html = html.escape(stamped)

    subject = f"Refund {status.title()} — {event_name}"
    
    if status == "approved":
        text_body = (
            f"Your refund request has been {status}!\n\n"
            f"Event: {event_name}\n"
            f"Amount: {currency} {amount:.2f}\n"
            f"Status: {status.title()}\n"
            f"Processed at: {stamped} (Eastern Time)\n\n"
            "Your refund will be processed within 3-5 business days.\n\n"
            f"Admin Notes: {notes_html}\n\n"
            "If you have any questions, please reply to this email."
        )
        html_body = f"""
        <html><body style="font-family:Arial,Helvetica,sans-serif">
          <h2 style="margin:0 0 12px 0;color:#059669">Refund Approved!</h2>
          <p style="margin:0 0 16px 0">Your refund request has been approved and will be processed shortly.</p>
          <table style="border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:4px 8px"><strong>Event</strong></td><td style="padding:4px 8px">{ev_html}</td></tr>
            <tr><td style="padding:4px 8px"><strong>Amount</strong></td><td style="padding:4px 8px">{amount_html}</td></tr>
            <tr><td style="padding:4px 8px"><strong>Status</strong></td><td style="padding:4px 8px;color:#059669">{status_html}</td></tr>
            <tr><td style="padding:4px 8px"><strong>Processed at</strong></td><td style="padding:4px 8px">{time_html} (Eastern Time)</td></tr>
          </table>
          <p style="margin:0 0 16px 0"><strong>Your refund will be processed within 3-5 business days.</strong></p>
          <div style="background-color:#f3f4f6;padding:12px;border-radius:6px;margin-bottom:16px">
            <p style="margin:0 0 8px 0"><strong>Admin Notes:</strong></p>
            <p style="margin:0;color:#6b7280">{notes_html}</p>
          </div>
          <p style="margin:0">If you have any questions, please reply to this email.</p>
        </body></html>
        """
    else:  # rejected
        text_body = (
            f"Your refund request has been {status}.\n\n"
            f"Event: {event_name}\n"
            f"Amount: {currency} {amount:.2f}\n"
            f"Status: {status.title()}\n"
            f"Processed at: {stamped} (Eastern Time)\n\n"
            f"Admin Notes: {notes_html}\n\n"
            "If you have any questions, please reply to this email."
        )
        html_body = f"""
        <html><body style="font-family:Arial,Helvetica,sans-serif">
          <h2 style="margin:0 0 12px 0;color:#dc2626">Refund Rejected</h2>
          <p style="margin:0 0 16px 0">Your refund request has been rejected.</p>
          <table style="border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:4px 8px"><strong>Event</strong></td><td style="padding:4px 8px">{ev_html}</td></tr>
            <tr><td style="padding:4px 8px"><strong>Amount</strong></td><td style="padding:4px 8px">{amount_html}</td></tr>
            <tr><td style="padding:4px 8px"><strong>Status</strong></td><td style="padding:4px 8px;color:#dc2626">{status_html}</td></tr>
            <tr><td style="padding:4px 8px"><strong>Processed at</strong></td><td style="padding:4px 8px">{time_html} (Eastern Time)</td></tr>
          </table>
          <div style="background-color:#fef2f2;padding:12px;border-radius:6px;margin-bottom:16px;border-left:4px solid #dc2626">
            <p style="margin:0 0 8px 0"><strong>Admin Notes:</strong></p>
            <p style="margin:0;color:#6b7280">{notes_html}</p>
          </div>
          <p style="margin:0">If you have any questions, please reply to this email.</p>
        </body></html>
        """

    # --- send via SESv2 ---
    try:
        resp = ses.send_email(
            FromEmailAddress="noreply@uoftjn.com",
            Destination={"ToAddresses": [email]},
            ReplyToAddresses=(["utjnit@gmail.com"]),
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
                {"Name": "type", "Value": "refund_notification"}
            ],
        )
        return (True, "Refund notification has been sent.")
    except ClientError:
        raise(False, "There has been an error while trying to send the refund notification")

# Example usage
if __name__ == "__main__":
    mid = send_contact_form(
        name="Kenta",
        email="kfploch@gmail.com",
        body="Testing"
    )
    print("Reponse:", mid[1])

    #mid = send_receipt(
    #    email = "kfploch@gmail.com",
    #    event_name = "Halloween Party",
    #    date = "August 2025, 2022"
    #)
    #print(mid[1])

def send_refund_confirmation(email: str, refund_id: str, amount: float, event_name: str, reason: str = "Registration failed after successful payment") -> bool:
    """
    Send refund confirmation email to user
    """
    try:
        if not check_email(email):
            print(f"❌ Invalid email address: {email}")
            return False

        settings = get_settings()
        ses = get_ses()
        
        # Get current time in Eastern timezone
        now = datetime.now(ZoneInfo("America/Toronto"))
        formatted_time = now.strftime("%B %d, %Y at %I:%M %p %Z")
        
        # Create HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Refund Confirmation - UTJN</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }}
                .content {{ padding: 20px; }}
                .refund-details {{ background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .amount {{ font-size: 24px; font-weight: bold; color: #28a745; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔄 Refund Confirmation</h1>
                    <p>Your refund has been processed successfully</p>
                </div>
                
                <div class="content">
                    <p>Dear Valued Member,</p>
                    
                    <p>We have successfully processed your refund for the following event:</p>
                    
                    <div class="refund-details">
                        <h3>Refund Details</h3>
                        <p><strong>Event:</strong> {html.escape(event_name)}</p>
                        <p><strong>Refund Amount:</strong> <span class="amount">${amount:.2f} CAD</span></p>
                        <p><strong>Refund ID:</strong> {html.escape(refund_id)}</p>
                        <p><strong>Reason:</strong> {html.escape(reason)}</p>
                        <p><strong>Processed:</strong> {formatted_time}</p>
                    </div>
                    
                    <p>The refund has been processed through Square and should appear in your original payment method within 1-3 business days.</p>
                    
                    <p>If you have any questions about this refund, please contact our support team.</p>
                    
                    <p>Thank you for your understanding.</p>
                    
                    <p>Best regards,<br>
                    UTJN Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        text_content = f"""
        Refund Confirmation - UTJN
        
        Dear Valued Member,
        
        We have successfully processed your refund for the following event:
        
        Event: {event_name}
        Refund Amount: ${amount:.2f} CAD
        Refund ID: {refund_id}
        Reason: {reason}
        Processed: {formatted_time}
        
        The refund has been processed through Square and should appear in your original payment method within 1-3 business days.
        
        If you have any questions about this refund, please contact our support team.
        
        Thank you for your understanding.
        
        Best regards,
        UTJN Team
        
        ---
        This is an automated message. Please do not reply to this email.
        """
        
        # Send email
        response = ses.send_email(
            FromEmailAddress=settings.from_email,
            Destination={
                'ToAddresses': [email]
            },
            Content={
                'Simple': {
                    'Subject': {
                        'Data': f'Refund Confirmation - {event_name}',
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Html': {
                            'Data': html_content,
                            'Charset': 'UTF-8'
                        },
                        'Text': {
                            'Data': text_content,
                            'Charset': 'UTF-8'
                        }
                    }
                }
            }
        )
        
        print(f"✅ Refund confirmation email sent to {email} for refund {refund_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending refund confirmation email: {e}")
        return False