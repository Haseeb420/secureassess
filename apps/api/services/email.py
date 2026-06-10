import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from core.config import settings
from core.logging import get_logger

logger = get_logger()

_DRIVE_LINK = "https://drive.google.com/drive/folders/1eTUc5rbbFRCfGAcBYexqnDCXkgxvcIYH?usp=drive_link"

_GUIDELINES = [
    "Complete the assessment in a single, uninterrupted session",
    "Ensure a stable internet connection throughout",
    "The app runs in fullscreen — do not attempt to exit during the assessment",
    "Close all non-essential applications before starting",
    "Do not share your access token with anyone",
    "The timer begins immediately after you enter your token",
    "Your code is auto-saved every few seconds",
]


def _build_html(candidate_name: str, assessment_title: str, token_value: str) -> str:
    guideline_rows = "".join(
        f"""<tr>
              <td style="padding:3px 0;vertical-align:top;width:18px;">
                <span style="color:#DE5E1F;font-weight:700;font-size:14px;">·</span>
              </td>
              <td style="padding:3px 0 3px 6px;font-size:13px;color:#555;line-height:1.5;">{g}</td>
            </tr>"""
        for g in _GUIDELINES
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>WamoLabs Technical Assessment</title>
</head>
<body style="margin:0;padding:0;background:#F2F2EE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2EE;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E0E0DA;max-width:600px;">

        <!-- ── Header ── -->
        <tr>
          <td style="background:#1E1E38;padding:28px 40px 24px;">
            <p style="margin:0 0 4px;font-family:monospace;font-size:10px;letter-spacing:4px;color:#DE5E1F;text-transform:uppercase;font-weight:700;">WAMOLABS</p>
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Technical Assessment Invitation</p>
          </td>
        </tr>

        <!-- ── Body ── -->
        <tr>
          <td style="padding:36px 40px 28px;">

            <p style="margin:0 0 20px;color:#1E1E38;font-size:15px;line-height:1.6;">Hi <strong>{candidate_name}</strong>,</p>

            <p style="margin:0 0 28px;color:#4A4A5A;font-size:14px;line-height:1.7;">
              We're pleased to invite you to complete the
              <strong style="color:#1E1E38;">{assessment_title}</strong>
              as part of the WamoLabs recruitment process.
              The assessment is conducted inside a secure desktop application to ensure a fair and consistent experience.
            </p>

            <!-- Token block -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F4;border:1px solid #E0E0DA;border-left:4px solid #DE5E1F;border-radius:8px;margin:0 0 32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:3px;color:#999;text-transform:uppercase;">Your Access Token</p>
                  <p style="margin:0 0 8px;font-family:monospace;font-size:26px;font-weight:700;color:#1E1E38;letter-spacing:5px;">{token_value}</p>
                  <p style="margin:0;font-size:12px;color:#999;">This token is unique to you. Do not share it with anyone.</p>
                </td>
              </tr>
            </table>

            <!-- Steps heading -->
            <p style="margin:0 0 20px;font-size:14px;font-weight:700;color:#1E1E38;letter-spacing:-0.2px;">How to Get Started</p>

            <!-- Step 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
              <tr>
                <td style="width:30px;vertical-align:top;padding-top:1px;">
                  <span style="display:inline-block;width:22px;height:22px;background:#DE5E1F;border-radius:50%;text-align:center;line-height:22px;color:#fff;font-size:11px;font-weight:700;">1</span>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#1E1E38;">Download the SecureAssess App</p>
                  <p style="margin:0 0 12px;font-size:13px;color:#666;line-height:1.5;">Click the button below to open the Google Drive folder and download the latest build for your operating system (macOS or Windows).</p>
                  <a href="{_DRIVE_LINK}" style="display:inline-block;background:#DE5E1F;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:0.2px;">Download App →</a>
                </td>
              </tr>
            </table>

            <!-- Step 2 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
              <tr>
                <td style="width:30px;vertical-align:top;padding-top:1px;">
                  <span style="display:inline-block;width:22px;height:22px;background:#DE5E1F;border-radius:50%;text-align:center;line-height:22px;color:#fff;font-size:11px;font-weight:700;">2</span>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1E1E38;">Install &amp; Launch</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">Run the installer and open SecureAssess once installation is complete. The app will prompt you for your access token.</p>
                </td>
              </tr>
            </table>

            <!-- Step 3 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="width:30px;vertical-align:top;padding-top:1px;">
                  <span style="display:inline-block;width:22px;height:22px;background:#DE5E1F;border-radius:50%;text-align:center;line-height:22px;color:#fff;font-size:11px;font-weight:700;">3</span>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1E1E38;">Enter Your Token &amp; Begin</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">
                    When prompted, enter your token exactly as shown:
                    <span style="font-family:monospace;font-weight:700;color:#1E1E38;background:#F2F2EE;padding:2px 6px;border-radius:4px;font-size:13px;">{token_value}</span>.
                    The timer starts the moment you begin.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Guidelines -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F4;border:1px solid #E0E0DA;border-radius:8px;margin:0 0 32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 14px;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:3px;color:#999;text-transform:uppercase;">Assessment Guidelines</p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    {guideline_rows}
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#666;line-height:1.7;">
              If you have any questions, simply reply to this email.<br>
              <strong style="color:#1E1E38;">Best of luck!</strong>
            </p>

          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background:#F2F2EE;padding:20px 40px;border-top:1px solid #E0E0DA;">
            <p style="margin:0;font-size:11px;color:#AAA;line-height:1.6;">
              Sent by <strong style="color:#888;">WamoLabs</strong> via SecureAssess &nbsp;·&nbsp;
              <a href="https://wamolabs.com" style="color:#DE5E1F;text-decoration:none;">wamolabs.com</a><br>
              This is an automated message — please do not reply unless you have assessment-related questions.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def send_invite_email(
    candidate_name: str,
    candidate_email: str,
    assessment_title: str,
    token_value: str,
) -> None:
    """Send a WamoLabs-branded assessment invite email via Gmail SMTP."""
    gmail_address = settings.GMAIL_ADDRESS
    gmail_password = settings.GMAIL_APP_PASSWORD

    if not gmail_address or not gmail_password:
        raise RuntimeError("Gmail credentials not configured (GMAIL_ADDRESS / GMAIL_APP_PASSWORD)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your WamoLabs Technical Assessment — {assessment_title}"
    msg["From"] = f"WamoLabs Hiring <{gmail_address}>"
    msg["To"] = candidate_email

    plain = (
        f"Hi {candidate_name},\n\n"
        f"You've been invited to complete the {assessment_title} at WamoLabs.\n\n"
        f"Your access token: {token_value}\n\n"
        f"Download the SecureAssess app here:\n{_DRIVE_LINK}\n\n"
        "Steps:\n"
        "1. Download and install the SecureAssess desktop app\n"
        "2. Launch the app and enter your token when prompted\n"
        "3. Complete the assessment — the timer starts as soon as you begin\n\n"
        "Guidelines:\n"
        + "\n".join(f"- {g}" for g in _GUIDELINES)
        + "\n\nGood luck!\nThe WamoLabs Team\n"
    )

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(_build_html(candidate_name, assessment_title, token_value), "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(gmail_address, gmail_password)
        smtp.sendmail(gmail_address, candidate_email, msg.as_string())

    logger.info("invite_email_sent", extra={"to": candidate_email, "token": token_value[:4] + "***"})
