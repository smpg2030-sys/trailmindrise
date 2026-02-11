import os
from twilio.rest import Client

class SMSService:
    @staticmethod
    def send_otp(mobile: str, otp: str):
        account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        from_number = os.environ.get("TWILIO_PHONE_NUMBER")

        if account_sid and auth_token and from_number:
            try:
                client = Client(account_sid, auth_token)
                message = client.messages.create(
                    body=f"Your MindRise verification code is: {otp}",
                    from_=from_number,
                    to=mobile if mobile.startswith("+") else f"+91{mobile}" # Assuming IN for now, or just use input
                )
                print(f"SMS sent via Twilio to {mobile}: {message.sid}")
                return True
            except Exception as e:
                print(f"Failed to send SMS via Twilio: {e}")
                # Fallback to console
                print(f"------------ FALLBACK SMS OTP for {mobile}: {otp} ------------")
                return False
        else:
            # Mock SMS
            print(f"------------ MOCK SMS OTP for {mobile}: {otp} ------------")
            return True
