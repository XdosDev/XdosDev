import contextlib
import getpass
import importlib.util
import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch
import urllib.error
import uuid

spec = importlib.util.spec_from_file_location("brevo_test", Path(__file__).resolve().parents[1] / "scripts/send-brevo-test.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
FAKE_KEY = "FAKE-NOT-A-REAL-KEY"

class Response:
    def __init__(self, status): self.status = status
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): raise AssertionError("Must not print or read provider response body")

class SmokeTest(unittest.TestCase):
    def execute(self, outcome=201, key=FAKE_KEY, key_error=None):
        calls = []
        handler_args = []
        class Opener:
            def open(self, request, timeout):
                calls.append(request)
                assert timeout == 20
                if isinstance(outcome, BaseException): raise outcome
                return Response(outcome)
        def opener_factory(*args):
            handler_args.extend(args)
            return Opener()
        output = io.StringIO()
        with patch.object(module.getpass, "getpass", return_value=key, side_effect=key_error), patch.object(module.urllib.request, "build_opener", side_effect=opener_factory), contextlib.redirect_stdout(output):
            result = module.main()
        self.assertNotIn(FAKE_KEY, output.getvalue())
        self.assertNotIn("PRIVATE ERROR", output.getvalue())
        self.assertLessEqual(len(calls), 1)
        return result, output.getvalue(), calls, handler_args

    def test_accepted_fixed_recipient_and_private_header(self):
        result, output, calls, handlers = self.execute()
        self.assertEqual(result, 0)
        self.assertIn("Acceptance is not delivery confirmation", output)
        self.assertEqual(len(calls), 1)
        req = calls[0]
        self.assertEqual(req.full_url, "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(req.method, "POST")
        self.assertEqual(req.get_header("Api-key"), FAKE_KEY)
        payload = json.loads(req.data)
        self.assertEqual(payload["sender"]["email"], "noreply@xdosdev.com")
        self.assertEqual(payload["to"], [{"email": "admin@xdosdev.com", "name": "XdosDev"}])
        self.assertEqual(payload["subject"], "[TEST] XdosDev Brevo setup")
        self.assertNotIn(FAKE_KEY.encode(), req.data)
        uuid.UUID(payload["headers"]["idempotencyKey"])
        self.assertTrue(any(isinstance(x, module.NoRedirect) for x in handlers))
        tls = next(x for x in handlers if isinstance(x, module.urllib.request.HTTPSHandler))._context
        self.assertTrue(tls.check_hostname)
        self.assertEqual(tls.verify_mode, module.ssl.CERT_REQUIRED)

    def test_network_failures_and_interruptions_are_uncertain_once(self):
        for error in [TimeoutError("PRIVATE ERROR"), urllib.error.URLError("PRIVATE ERROR"), ConnectionResetError("PRIVATE ERROR"), KeyboardInterrupt()]:
            with self.subTest(error=type(error).__name__):
                result, output, calls, _ = self.execute(outcome=error)
                self.assertEqual(result, 2)
                self.assertEqual(len(calls), 1)
                self.assertIn("may already have been sent", output)

    def test_http_errors_do_not_leak_or_retry(self):
        for status in [301, 302, 400, 401, 403, 408, 429, 500, 503]:
            with self.subTest(status=status):
                error = urllib.error.HTTPError("https://api.brevo.com/v3/smtp/email", status, "PRIVATE ERROR", {}, io.BytesIO(FAKE_KEY.encode()))
                result, output, calls, _ = self.execute(outcome=error)
                self.assertEqual(result, 2)
                self.assertEqual(len(calls), 1)
                self.assertIn(f"HTTP {status}", output)
                self.assertIn("Do not rerun yet", output)

    def test_unexpected_success_status_is_not_delivery_claim(self):
        for status in [200, 202, 204]:
            result, output, calls, _ = self.execute(outcome=status)
            self.assertEqual(result, 2)
            self.assertIn("unconfirmed", output)
            self.assertEqual(len(calls), 1)

    def test_empty_or_embedded_whitespace_key_never_sends(self):
        for key in ["", "  ", "fake key", "fake\rkey", "fake\nkey"]:
            result, output, calls, _ = self.execute(key=key)
            self.assertEqual(result, 1)
            self.assertEqual(calls, [])

    def test_private_input_failure_never_sends(self):
        for error in [getpass.GetPassWarning("PRIVATE ERROR"), EOFError(), KeyboardInterrupt(), OSError("PRIVATE ERROR")]:
            result, output, calls, _ = self.execute(key_error=error)
            self.assertEqual(result, 1)
            self.assertIn("nothing sent", output)
            self.assertEqual(calls, [])

    def test_warning_stops_echo_fallback(self):
        def unsafe_prompt(_):
            module.warnings.warn("PRIVATE ERROR", getpass.GetPassWarning)
            raise AssertionError("Echo fallback must never be reached")
        output = io.StringIO()
        with patch.object(module.getpass, "getpass", side_effect=unsafe_prompt), patch.object(module.urllib.request, "build_opener") as opener, contextlib.redirect_stdout(output):
            self.assertEqual(module.main(), 1)
            opener.assert_not_called()
        self.assertNotIn("PRIVATE ERROR", output.getvalue())

    def test_redirect_handler_blocks_new_destination(self):
        self.assertIsNone(module.NoRedirect().redirect_request(None, None, 302, "redirect", {}, "https://elsewhere.invalid/"))

unittest.main()
