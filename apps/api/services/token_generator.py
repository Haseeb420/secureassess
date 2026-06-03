import secrets
import string


def generate_token_value() -> str:
    """Generates XXXX-XXXX-XXXX format token using cryptographic randomness."""
    chars = string.ascii_uppercase + string.digits
    groups = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(3)]
    return '-'.join(groups)
