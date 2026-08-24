# Security Policy

## Data and credential safety

- Never commit a real LLM API Key, recruitment-site password, exported backup, or other personal recruiting information.
- Do not upload a complete OfferFlow backup to a public issue. Create a sanitized reproduction instead.
- Normal JSON and CSV exports deliberately exclude recruitment-site secrets and LLM API Keys.
- Markdown rendering is sanitized, but imported files should still be treated as untrusted until validation succeeds.

## Password feature boundary

OfferFlow is a local personal recruitment-management tool, not a professional password manager. In no-master-password mode, Web Crypto encryption mainly reduces plaintext exposure when ordinary application data leaks. It cannot protect secrets if an attacker controls the current browser, operating-system account, extension environment, or OfferFlow's runtime.

## Reporting a vulnerability

Please report security vulnerabilities privately to the repository owner instead of opening a public issue. Include a concise reproduction, affected version/commit, expected impact, and a sanitized proof of concept. Do not include real personal data or credentials.
