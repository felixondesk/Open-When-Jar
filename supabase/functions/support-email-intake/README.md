# Support email intake

The Edge Function accepts normalized, plain-text inbound support messages at
the support-email-intake function URL. It creates an email-only ticket in the
Admin Portal's Support queue. It never grants account access or performs
account changes. A sender must sign in and use the Account request form for
access, correction, export, or deletion actions.

## Request authentication

Configure the 32-byte-or-longer SUPPORT_EMAIL_WEBHOOK_SECRET Supabase
function secret after choosing the inbound mailbox/provider. The provider
adapter must send:

- X-OWJ-Timestamp: current Unix time in seconds.
- X-OWJ-Signature: v1= followed by lowercase hexadecimal HMAC-SHA256.
- Content-Type: application/json.

The HMAC input is the UTF-8 bytes of timestamp + "." + raw_request_body.
Requests outside the five-minute timestamp window are rejected. Signature
verification happens before parsing or storing the payload.

## Normalized JSON payload

    {
      "message_id": "<stable-provider-or-rfc-message-id>",
      "from_email": "person@example.com",
      "subject": "I need help",
      "text": "Plain-text message body"
    }

The message reference is unique, so provider retries return success without
creating a second ticket. Messages are limited to 10,000 characters and a
maximum of five new tickets per sender in any 24-hour period. Attachments and
HTML bodies are not stored. The mailbox provider's own spam filtering and the
provider-specific adapter remain a launch setup task.
