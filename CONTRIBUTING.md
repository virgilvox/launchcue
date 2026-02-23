# Contributing to LaunchCue

Thank you for your interest in contributing to LaunchCue! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/launchcue.git`
3. Install dependencies: `npm install`
4. Set up your environment — see [docs/development.md](docs/development.md) for detailed setup instructions
5. Create a feature branch: `git checkout -b feature/your-feature-name`

## How to Report Bugs

- Open a [GitHub Issue](https://github.com/yourusername/launchcue/issues) with:
  - Clear title describing the bug
  - Steps to reproduce
  - Expected vs actual behavior
  - Browser/OS information if relevant
  - Screenshots if applicable

## How to Submit Pull Requests

1. **Branch** from `main` — use descriptive names like `feature/task-export` or `fix/login-redirect`
2. **Write code** following the conventions below
3. **Test** your changes — run `npm run build` and `npm test` to verify nothing is broken
4. **Commit** with clear messages (see format below)
5. **Push** your branch and open a PR against `main`
6. **Describe** your changes in the PR description — what changed and why

## Code Style

- **Vue components**: Use Composition API with `<script setup>`
- **Backend functions**: CommonJS (`require`/`module.exports`), Zod for input validation
- **TypeScript**: Used for frontend services, stores, router, and types. Backend stays as JS.
- **Formatting**: Follow existing code style — consistent indentation (2 spaces), single quotes
- **Error handling**: Use `withErrorHandling` wrapper for new endpoints, sanitize error messages in production
- **Validation**: All user input must be validated with Zod schemas
- **Security**: Never expose secrets in error messages, always use parameterized queries

## Commit Message Format

```
<type>: <short description>

<optional longer description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples:
- `feat: add task export to CSV`
- `fix: prevent duplicate team invitations`
- `docs: update API reference for campaigns endpoint`

## Security Issues

If you discover a security vulnerability, please do **not** open a public issue. Instead, see [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## Questions?

Open a discussion or issue on GitHub if you have questions about contributing.
