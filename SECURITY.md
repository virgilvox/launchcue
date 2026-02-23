# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | Yes                |

Only the latest version deployed to production receives security updates.

## Reporting a Vulnerability

If you discover a security vulnerability in LaunchCue, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

Send an email to **security@launchcue.dev** (or the repository owner's contact) with:

1. **Description** of the vulnerability
2. **Steps to reproduce** (include URLs, request/response examples if applicable)
3. **Impact assessment** — what could an attacker do?
4. **Suggested fix** (optional, but appreciated)

### What to Expect

- **Acknowledgment** within 48 hours of your report
- **Assessment** within 5 business days — we'll confirm whether the issue qualifies as a security vulnerability
- **Fix timeline** — critical issues will be patched within 7 days; high-severity within 14 days
- **Disclosure** — we'll coordinate with you on public disclosure timing after a fix is deployed

### What Qualifies as a Security Issue

- Authentication or authorization bypass
- SQL/NoSQL injection
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Sensitive data exposure (API keys, tokens, passwords)
- Server-side request forgery (SSRF)
- Rate limiting bypass on authentication endpoints
- Token handling vulnerabilities (JWT, API keys)

### What Does NOT Qualify

- Denial of service (DoS) attacks
- Social engineering
- Issues in third-party dependencies (report these to the upstream project)
- Missing security headers on non-sensitive pages
- Issues requiring physical access to a user's device

## Security Measures

For details on LaunchCue's security architecture, see [docs/security.md](docs/security.md).
