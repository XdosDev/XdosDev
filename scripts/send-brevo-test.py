import getpass
import json
import ssl
import urllib.error
import urllib.request
import uuid
import warnings


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    attempted = False
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            key = getpass.getpass("Brevo API key (hidden, not saved): ").strip()
        if not key or any(c.isspace() for c in key):
            print("Empty or malformed key; nothing sent.")
            return 1
        payload = {
            "sender": {"email": "noreply@xdosdev.com", "name": "XdosDev website"},
            "to": [{"email": "admin@xdosdev.com", "name": "XdosDev"}],
            "subject": "[TEST] XdosDev Brevo setup",
            "textContent": "This is the single authorized Brevo setup test. No customer enquiry data is included.",
            "headers": {"idempotencyKey": str(uuid.uuid4())},
        }
        request = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode("utf-8"),
            headers={"api-key": key, "Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        opener = urllib.request.build_opener(
            NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context())
        )
        attempted = True
        with opener.open(request, timeout=20) as response:
            status = response.status
        if status == 201:
            print("Brevo accepted the test. Check admin@xdosdev.com, including spam. Acceptance is not delivery confirmation.")
            return 0
        print(f"Unexpected HTTP {status}; sending is unconfirmed. Check Zoho and Brevo logs before running this again.")
        return 2
    except urllib.error.HTTPError as error:
        print(f"Brevo returned HTTP {error.code}; no success confirmed. Share only this status, not your key. Do not rerun yet.")
        return 2
    except (Exception, KeyboardInterrupt):
        if attempted:
            print("Send outcome is unconfirmed. The email may already have been sent. Check Zoho and Brevo logs before running this again.")
            return 2
        print("Private input/setup did not complete; nothing sent. Run this in your interactive WSL terminal.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
