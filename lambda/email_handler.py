import json
import boto3
import os
import uuid
import re
from botocore.exceptions import ClientError

REGION = os.environ.get('AWS_REGION', 'us-east-1')
ses_client = boto3.client('ses', region_name=REGION)
s3_client  = boto3.client('s3',  region_name=REGION)

FROM_EMAIL              = os.environ.get('FROM_EMAIL', '')
STRIDE_API_KEY          = os.environ.get('STRIDE_API_KEY', '')
ATTACHMENTS_BUCKET      = os.environ.get('ATTACHMENTS_BUCKET', '')
PRESIGN_EXPIRES_SECONDS = int(os.environ.get('PRESIGN_EXPIRES_SECONDS', '900'))  # 15 min default
MAX_UPLOAD_BYTES        = int(os.environ.get('MAX_UPLOAD_BYTES', str(25 * 1024 * 1024)))  # 25 MB default


def lambda_handler(event, context):
    headers_dict   = event.get('headers', {})
    request_origin = headers_dict.get('origin') or headers_dict.get('Origin', '*')

    headers = {
        'Access-Control-Allow-Origin':  request_origin,
        'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type':                 'application/json',
    }

    http_method = (
        event.get('httpMethod') or
        event.get('requestContext', {}).get('http', {}).get('method', '')
    )

    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'message': 'OK'})}

    if http_method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    provided_key = headers_dict.get('x-api-key') or headers_dict.get('X-Api-Key', '')
    if STRIDE_API_KEY and provided_key != STRIDE_API_KEY:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}

    try:
        body       = json.loads(event.get('body', '{}'))
        email_type = body.get('type')

        if   email_type == 'stride_digest':         return handle_stride_digest(body, headers)
        elif email_type == 'stride_invite':          return handle_stride_invite(body, headers)
        elif email_type == 'stride_password_reset':  return handle_password_reset(body, headers)
        elif email_type == 'stride_verify_email':    return handle_verify_email(body, headers)
        elif email_type == 'stride_contact':         return handle_stride_contact(body, headers)
        elif email_type == 'stride_due_date':        return handle_stride_due_date(body, headers)
        elif email_type == 'stride_otp':             return handle_stride_otp(body, headers)
        elif email_type == 'stride_upload_url':      return handle_upload_url(body, headers)
        else:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid type',
                    'supported_types': ['stride_digest', 'stride_invite', 'stride_password_reset', 'stride_verify_email', 'stride_contact', 'stride_otp', 'stride_upload_url']
                })
            }

    except json.JSONDecodeError:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Invalid JSON'})}
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}


# ── Password Reset ────────────────────────────────────────────────────────────

def handle_password_reset(body, headers):
    email     = body.get('email')
    name      = body.get('name', 'there')
    reset_url = body.get('resetUrl')

    if not all([email, reset_url]):
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: email, resetUrl'})}

    html_body = f"""
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;
                background:#fff;border-radius:16px;overflow:hidden">
        <div style="padding:32px 32px 0;background:linear-gradient(135deg,#0058be,#2170e4)">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;
                       color:rgba(255,255,255,.7);text-transform:uppercase">Stride</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#fff">
                Reset your password
            </h1>
        </div>
        <div style="padding:28px 32px">
            <p style="margin:0 0 8px;font-size:15px;color:#1e293b">
                Hi <strong>{name}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#475569">
                We received a request to reset your Stride password.
                Click the button below to choose a new one.
                This link expires in <strong>15 minutes</strong>.
            </p>
            <a href="{reset_url}"
               style="display:inline-block;padding:13px 28px;background:#0058be;
                      color:#fff;border-radius:10px;text-decoration:none;
                      font-weight:700;font-size:15px">
                Reset password
            </a>
            <p style="margin-top:24px;font-size:12px;color:#94a3b8">
                If you didn&apos;t request this, you can safely ignore this email.
                Your password won&apos;t change.
            </p>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9">
            <p style="margin:0;font-size:11px;color:#94a3b8">
                Or copy this link: {reset_url}
            </p>
        </div>
    </div>"""

    try:
        response = ses_client.send_email(
            Source=f'Stride <{FROM_EMAIL}>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': 'Reset your Stride password', 'Charset': 'UTF-8'},
                'Body':    {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
            }
        )
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'success': True, 'messageId': response['MessageId']})}
    except ClientError as e:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': e.response['Error']['Message']})}


# ── Email Verification ────────────────────────────────────────────────────────

def handle_verify_email(body, headers):
    email      = body.get('email')
    name       = body.get('name', 'there')
    verify_url = body.get('verifyUrl')

    if not all([email, verify_url]):
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: email, verifyUrl'})}

    html_body = f"""
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;
                background:#fff;border-radius:16px;overflow:hidden">
        <div style="padding:32px 32px 0;background:linear-gradient(135deg,#006947,#00855b)">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;
                       color:rgba(255,255,255,.7);text-transform:uppercase">Stride</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#fff">
                Verify your email
            </h1>
        </div>
        <div style="padding:28px 32px">
            <p style="margin:0 0 24px;font-size:14px;color:#475569">
                Hi <strong>{name}</strong>, click below to confirm your email address and
                activate your Stride account.
            </p>
            <a href="{verify_url}"
               style="display:inline-block;padding:13px 28px;background:#006947;
                      color:#fff;border-radius:10px;text-decoration:none;
                      font-weight:700;font-size:15px">
                Verify email
            </a>
            <p style="margin-top:24px;font-size:12px;color:#94a3b8">
                This link expires in 24 hours.
                If you didn&apos;t create a Stride account, you can ignore this email.
            </p>
        </div>
    </div>"""

    try:
        response = ses_client.send_email(
            Source=f'Stride <{FROM_EMAIL}>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': 'Verify your Stride email', 'Charset': 'UTF-8'},
                'Body':    {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
            }
        )
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'success': True, 'messageId': response['MessageId']})}
    except ClientError as e:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': e.response['Error']['Message']})}


# ── Daily Digest ──────────────────────────────────────────────────────────────

def handle_stride_digest(body, headers):
    email   = body.get('email')
    name    = body.get('name')
    digest  = body.get('digest', {})

    if not all([email, name]):
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: email, name'})}

    total       = digest.get('totalIssues', 0)
    done        = digest.get('doneThisWeek', 0)
    in_progress = digest.get('inProgress', 0)
    overdue     = digest.get('overdue', 0)
    sprint_name = digest.get('sprintName')
    days_left   = digest.get('sprintDaysLeft')

    sprint_row = ''
    if sprint_name:
        sprint_row = f"""
        <p style="margin:0 0 16px;padding:10px 14px;background:#f0f9ff;
                   border-radius:8px;font-size:13px;color:#0369a1">
            &#127939; <strong>{sprint_name}</strong> &mdash; {days_left or '?'} days left
        </p>"""

    subject = f"Your daily digest \u2014 {sprint_name}" if sprint_name else "Your Stride daily digest"

    html_body = f"""
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;
                background:#fff;border-radius:16px;overflow:hidden">
        <div style="padding:28px 32px 0;background:linear-gradient(135deg,#6366f1,#8b5cf6)">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;
                       color:rgba(255,255,255,.7);text-transform:uppercase">Daily Digest</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#fff">
                Good morning, {name} &#128075;
            </h1>
        </div>
        <div style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:14px;color:#475569">
                Here&apos;s your Stride snapshot for today.
            </p>
            {sprint_row}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:14px 10px;background:#f8fafc;border-radius:10px;text-align:center">
                    <div style="font-size:28px;font-weight:900;color:#1e293b">{total}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px">Total Issues</div>
                </td>
                <td style="width:4px"></td>
                <td style="padding:14px 10px;background:#f0fdf4;border-radius:10px;text-align:center">
                    <div style="font-size:28px;font-weight:900;color:#16a34a">{done}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px">Done This Week</div>
                </td>
                <td style="width:4px"></td>
                <td style="padding:14px 10px;background:#eff6ff;border-radius:10px;text-align:center">
                    <div style="font-size:28px;font-weight:900;color:#2563eb">{in_progress}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px">In Progress</div>
                </td>
                <td style="width:4px"></td>
                <td style="padding:14px 10px;background:#fef2f2;border-radius:10px;text-align:center">
                    <div style="font-size:28px;font-weight:900;color:#dc2626">{overdue}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px">Overdue</div>
                </td>
              </tr>
            </table>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9">
            <p style="margin:0;font-size:11px;color:#94a3b8">
                Sent because Daily AI Digest is enabled in your Stride settings.
            </p>
        </div>
    </div>"""

    try:
        response = ses_client.send_email(
            Source=f'Stride <{FROM_EMAIL}>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body':    {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
            }
        )
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'success': True, 'messageId': response['MessageId']})}
    except ClientError as e:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': e.response['Error']['Message']})}


# ── Due Date Reminder ─────────────────────────────────────────────────────────

def handle_stride_due_date(body, headers):
    email       = body.get('email')
    name        = body.get('name', 'there')
    issue_title = body.get('issueTitle', '')
    is_overdue  = body.get('isOverdue', False)
    due_date    = body.get('dueDate', '')

    if not email:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Missing required field: email'})}

    label       = 'Overdue' if is_overdue else 'Due today'
    accent      = '#dc2626' if is_overdue else '#d97706'
    bg          = '#fef2f2' if is_overdue else '#fffbeb'
    subject     = f'{label}: "{issue_title}"'

    html_body = f"""
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;
                background:#fff;border-radius:16px;overflow:hidden">
        <div style="padding:28px 32px 0;background:{accent}">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;
                       color:rgba(255,255,255,.7);text-transform:uppercase">Stride</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#fff">
                {label} &#9201;
            </h1>
        </div>
        <div style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:14px;color:#475569">
                Hi <strong>{name}</strong>, the following issue is <strong>{label.lower()}</strong>{f' ({due_date})' if due_date else ''}:
            </p>
            <div style="padding:14px 18px;background:{bg};border-radius:10px;
                        border-left:4px solid {accent};margin-bottom:24px">
                <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b">{issue_title}</p>
            </div>
            <p style="margin:0;font-size:12px;color:#94a3b8">
                You are receiving this because you are assigned to this issue in Stride.
            </p>
        </div>
    </div>"""

    try:
        response = ses_client.send_email(
            Source=f'Stride <{FROM_EMAIL}>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body':    {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
            }
        )
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'success': True, 'messageId': response['MessageId']})}
    except ClientError as e:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': e.response['Error']['Message']})}


# ── Contact Form ──────────────────────────────────────────────────────────────

def handle_stride_contact(body, headers):
    to_email       = body.get('email')          # Stride team inbox (CONTACT_EMAIL)
    name           = body.get('name', 'Someone')
    submitter_email = body.get('submitterEmail', '')
    company        = body.get('company', '')
    message        = body.get('message', '')

    if not all([to_email, submitter_email, message]):
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: email, submitterEmail, message'})}

    company_row = f"""
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;width:110px">Company</td>
          <td style="padding:8px 0;font-size:13px;color:#1e293b">{company}</td>
        </tr>""" if company else ''

    html_body = f"""
    <div style="font-family:Inter,sans-serif;max-width:540px;margin:0 auto;
                background:#fff;border-radius:16px;overflow:hidden">
        <div style="padding:28px 32px 0;background:linear-gradient(135deg,#0058be,#2170e4)">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;
                       color:rgba(255,255,255,.7);text-transform:uppercase">Stride</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#fff">
                New contact form submission
            </h1>
        </div>
        <div style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:14px;color:#475569">
                Someone reached out via the Stride website.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border-top:1px solid #f1f5f9;margin-bottom:20px">
                <tr>
                  <td style="padding:8px 0;color:#64748b;font-size:13px;width:110px">Name</td>
                  <td style="padding:8px 0;font-size:13px;color:#1e293b">{name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b;font-size:13px">Email</td>
                  <td style="padding:8px 0;font-size:13px">
                      <a href="mailto:{submitter_email}" style="color:#0058be">{submitter_email}</a>
                  </td>
                </tr>
                {company_row}
            </table>
            <div style="background:#f8fafc;border-radius:10px;padding:16px 18px;
                        font-size:14px;color:#334155;white-space:pre-wrap;line-height:1.6">
{message}
            </div>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9">
            <a href="mailto:{submitter_email}"
               style="display:inline-block;padding:10px 22px;background:#0058be;
                      color:#fff;border-radius:8px;text-decoration:none;
                      font-weight:700;font-size:13px">
                Reply to {name}
            </a>
        </div>
    </div>"""

    try:
        response = ses_client.send_email(
            Source=f'Stride <{FROM_EMAIL}>',
            Destination={'ToAddresses': [to_email]},
            ReplyToAddresses=[submitter_email],
            Message={
                'Subject': {'Data': f'New contact from {name}', 'Charset': 'UTF-8'},
                'Body':    {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
            }
        )
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'success': True, 'messageId': response['MessageId']})}
    except ClientError as e:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': e.response['Error']['Message']})}


# ── OTP Verification ──────────────────────────────────────────────────────────

def handle_stride_otp(body, headers):
    email = body.get('email')
    name  = body.get('name', 'there')
    otp   = body.get('otp')

    if not all([email, otp]):
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: email, otp'})}

    html_body = f"""
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;
                background:#fff;border-radius:16px;overflow:hidden">
        <div style="padding:32px 32px 0;background:linear-gradient(135deg,#6366f1,#8b5cf6)">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;
                       color:rgba(255,255,255,.7);text-transform:uppercase">Stride</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#fff">
                Verify your email address
            </h1>
        </div>
        <div style="padding:32px 32px 24px">
            <p style="margin:0 0 8px;font-size:15px;color:#1e293b">
                Hi <strong>{name}</strong>,
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#475569">
                Use the code below to verify your email and complete your Stride account setup.
            </p>
            <div style="text-align:center;padding:24px 0;background:#f8fafc;
                        border-radius:12px;margin-bottom:24px">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.15em;
                           color:#6366f1;text-transform:uppercase">Your verification code</p>
                <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:.25em;
                           color:#1e293b;font-family:monospace">{otp}</p>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-align:center">
                This code expires in <strong>10 minutes</strong>.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
                If you didn&apos;t request this, you can safely ignore this email.
            </p>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9">
            <p style="margin:0;font-size:11px;color:#94a3b8">
                Never share this code with anyone. Stride will never ask for it.
            </p>
        </div>
    </div>"""

    try:
        response = ses_client.send_email(
            Source=f'Stride <{FROM_EMAIL}>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': f'{otp} is your Stride verification code', 'Charset': 'UTF-8'},
                'Body':    {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
            }
        )
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'success': True, 'messageId': response['MessageId']})}
    except ClientError as e:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': e.response['Error']['Message']})}


# ── Invite ────────────────────────────────────────────────────────────────────

def handle_stride_invite(body, headers):
    email        = body.get('email')
    org_name     = body.get('orgName')
    inviter_name = body.get('inviterName', 'Someone')
    invite_url   = body.get('inviteUrl')

    if not all([email, org_name, invite_url]):
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: email, orgName, inviteUrl'})}

    html_body = f"""
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;
                background:#fff;border-radius:16px;overflow:hidden">
        <div style="padding:32px 32px 0;background:linear-gradient(135deg,#6366f1,#8b5cf6)">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;
                       color:rgba(255,255,255,.7);text-transform:uppercase">Stride</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#fff">
                You&apos;re invited to Stride &#127881;
            </h1>
        </div>
        <div style="padding:28px 32px">
            <p style="margin:0 0 24px;font-size:15px;color:#475569">
                <strong>{inviter_name}</strong> has invited you to join
                <strong>{org_name}</strong> on Stride.
            </p>
            <a href="{invite_url}"
               style="display:inline-block;padding:13px 28px;background:#6366f1;
                      color:#fff;border-radius:10px;text-decoration:none;
                      font-weight:700;font-size:15px">
                Accept invitation
            </a>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9">
            <p style="margin:0;font-size:12px;color:#94a3b8">
                This invite expires in 48 hours.
                If you didn&apos;t expect this, you can safely ignore it.
            </p>
        </div>
    </div>"""

    try:
        response = ses_client.send_email(
            Source=f'Stride <{FROM_EMAIL}>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {
                    'Data': f"You've been invited to join {org_name} on Stride",
                    'Charset': 'UTF-8'
                },
                'Body': {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
            },
            ReplyToAddresses=[FROM_EMAIL]
        )
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'success': True, 'messageId': response['MessageId']})}
    except ClientError as e:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': e.response['Error']['Message']})}


# ── Attachment upload (S3 presigned PUT) ──────────────────────────────────────

_SAFE_FILENAME_RE = re.compile(r'[^A-Za-z0-9._-]+')


def _sanitize_filename(name: str) -> str:
    name = (name or 'file').strip() or 'file'
    return _SAFE_FILENAME_RE.sub('_', name)[:200]


def handle_upload_url(body, headers):
    """
    Mint a short-lived S3 presigned PUT URL for the client to upload a file
    directly. The client then notifies the Stride API with the resulting
    public GET URL + metadata.

    Body:
      filename      (str, required)   Original filename (for extension/display)
      contentType   (str, required)   MIME type
      organizationId(str, optional)   Used as a path prefix for organization
      issueId       (str, optional)   Used as a path prefix for the issue
      size          (int, optional)   Bytes; rejected if > MAX_UPLOAD_BYTES

    Returns:
      uploadUrl  : presigned PUT URL (15 min)
      fileUrl    : permanent public GET URL the API stores on the Attachment
      key        : the S3 object key
    """
    if not ATTACHMENTS_BUCKET:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': 'ATTACHMENTS_BUCKET env var not configured'})}

    filename     = body.get('filename')
    content_type = body.get('contentType')
    if not filename or not content_type:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'filename and contentType are required'})}

    size = body.get('size')
    if isinstance(size, int) and size > MAX_UPLOAD_BYTES:
        return {'statusCode': 413, 'headers': headers,
                'body': json.dumps({'error': f'File too large (max {MAX_UPLOAD_BYTES} bytes)'})}

    org_id   = body.get('organizationId') or 'global'
    issue_id = body.get('issueId') or 'misc'
    safe     = _sanitize_filename(filename)
    key      = f'attachments/{org_id}/{issue_id}/{uuid.uuid4().hex}-{safe}'

    try:
        upload_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket':      ATTACHMENTS_BUCKET,
                'Key':         key,
                'ContentType': content_type,
            },
            ExpiresIn=PRESIGN_EXPIRES_SECONDS,
        )
    except ClientError as e:
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': e.response['Error']['Message']})}

    file_url = f'https://{ATTACHMENTS_BUCKET}.s3.{REGION}.amazonaws.com/{key}'

    return {
        'statusCode': 200, 'headers': headers,
        'body': json.dumps({
            'uploadUrl': upload_url,
            'fileUrl':   file_url,
            'key':       key,
        }),
    }
