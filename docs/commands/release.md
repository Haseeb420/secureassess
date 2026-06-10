# Release Management

Version bumping and GitHub releases are handled through GitHub Actions. You trigger them; CI builds the artifacts.

---

## How releases work

1. You run `make release-patch` (or minor/major)
2. GitHub Actions runs `release.yml`:
   - Bumps the version in `VERSION` file
   - Builds desktop binaries for macOS, Windows, and Linux
   - Creates a GitHub Release with the installers attached
3. Fly.io auto-deploys the API via a separate `deploy.yml` workflow

---

## Version Commands

| Command | What it does |
|---|---|
| `make version` | Show current version from `VERSION` file |
| `make version-next-patch` | Preview what the next patch version would be |
| `make version-next-minor` | Preview what the next minor version would be |
| `make version-next-major` | Preview what the next major version would be |

---

## Trigger a Release

| Command | What it does |
|---|---|
| `make release-patch` | Trigger patch release via GitHub Actions (x.x.N+1) |
| `make release-minor` | Trigger minor release (x.N+1.0) |
| `make release-major` | Trigger major release (N+1.0.0) |

All three require the GitHub CLI (`gh`) to be authenticated.

---

## Monitor Releases

| Command | What it does |
|---|---|
| `make release-status` | Show last 5 release workflow runs |
| `make release-watch` | Watch the latest release run live |
| `make release-logs` | Show full logs from the latest release run |
| `make releases-list` | List all GitHub releases |
| `make release-open` | Open the latest release page in browser |
| `make release-delete-old` | Delete releases older than the 10 most recent |

---

## Draft Release (for testing)

Build a macOS installer and upload it as a draft release without bumping the version:

```bash
make release-draft
```

The draft won't be visible to anyone until you publish it from the GitHub Releases page.
