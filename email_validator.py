#!/usr/bin/env python3
"""
Email Validator Utility

A simple, practical email validation module using regex pattern matching.
Implements a simplified version of RFC 5322 suitable for most real-world use cases.

Usage:
    from email_validator import validate_email
    
    is_valid = validate_email("user@example.com")
    print(is_valid)  # True
    
    is_valid = validate_email("invalid.email")
    print(is_valid)  # False

Pattern:
    The regex pattern matches:
    - Local part: alphanumeric, dots, underscores, hyphens
    - @ symbol separator
    - Domain: alphanumeric, dots, hyphens
    - TLD: 2-6 alphabetic characters
    
    This pattern is practical for most email validation scenarios.
    For strict RFC 5322 compliance, consider using the `email-validator` package.
"""

import re
from typing import Union


# RFC 5322 simplified pattern for practical email validation
# Allows alphanumeric, dots, underscores, hyphens, and plus signs in local part
EMAIL_PATTERN = r'^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'


def validate_email(email: Union[str, None]) -> bool:
    """
    Validate an email address using regex pattern matching.
    
    Args:
        email: The email string to validate. Can be str or None.
    
    Returns:
        bool: True if the email is valid, False otherwise.
    
    Examples:
        >>> validate_email("user@example.com")
        True
        
        >>> validate_email("user.name+tag@example.co.uk")
        True
        
        >>> validate_email("invalid.email")
        False
        
        >>> validate_email("")
        False
        
        >>> validate_email(None)
        False
        
        >>> validate_email(123)
        False
    """
    # Handle None and non-string inputs
    if email is None:
        return False
    
    if not isinstance(email, str):
        return False
    
    # Handle empty strings and whitespace-only strings
    email_stripped = email.strip()
    if not email_stripped:
        return False
    
    # Validate against the email pattern
    return bool(re.match(EMAIL_PATTERN, email_stripped))


def validate_email_list(emails: list) -> dict:
    """
    Validate a list of email addresses.
    
    Args:
        emails: A list of email strings to validate.
    
    Returns:
        dict: A dictionary with keys:
            - 'valid': list of valid emails
            - 'invalid': list of invalid emails
    
    Examples:
        >>> result = validate_email_list(["user@example.com", "invalid.email", "test@domain.org"])
        >>> print(result)
        {'valid': ['user@example.com', 'test@domain.org'], 'invalid': ['invalid.email']}
    """
    valid = []
    invalid = []
    
    for email in emails:
        if validate_email(email):
            valid.append(email)
        else:
            invalid.append(email)
    
    return {
        'valid': valid,
        'invalid': invalid
    }


if __name__ == "__main__":
    # Simple test cases
    test_emails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "invalid.email",
        "user@.com",
        "@example.com",
        "user@example",
        "",
        "   ",
        "user @example.com",
        "user@example .com",
    ]
    
    print("Email Validator Test Results")
    print("=" * 50)
    
    for email in test_emails:
        result = validate_email(email)
        status = "✓ VALID" if result else "✗ INVALID"
        display = f'"{email}"' if email else '"" (empty)'
        print(f"{display:<30} {status}")
    
    print("\n" + "=" * 50)
    print("Batch validation test:")
    batch = ["alice@example.com", "invalid", "bob.smith@company.org", "no-at-sign.com"]
    result = validate_email_list(batch)
    print(f"Valid:   {result['valid']}")
    print(f"Invalid: {result['invalid']}")
