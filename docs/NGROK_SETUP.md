# ngrok Setup — Judge0 Tunnel

ngrok is used **only** to expose Judge0 on the ASUS TUF F17 (Linux Mint) machine.
The API and Admin dashboard are on Fly.io and Vercel respectively — they do not use ngrok.

```
https://unkind-freeware-unmoved.ngrok-free.dev  →  ASUS :2358 (Judge0)
```

---

## Install ngrok (on ASUS machine)

```bash
# Linux
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list \
  && sudo apt update && sudo apt install ngrok
```

---

## Authenticate (one time per machine)

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

Get your token from: https://dashboard.ngrok.com/authtokens

Or set it as an environment variable instead (used by `ngrok.yml`):

```bash
export NGROK_AUTHTOKEN=your_token_here
# Add to ~/.bashrc to persist
```

---

## ngrok.yml

The `ngrok.yml` at repo root defines the single Judge0 tunnel:

```yaml
version: "3"
agent:
  authtoken: ${NGROK_AUTHTOKEN}

tunnels:
  judge0:
    proto: http
    addr: 2358
    domain: unkind-freeware-unmoved.ngrok-free.dev
    inspect: true
```

Copy this file to the ASUS machine at `~/.config/ngrok/ngrok.yml` or pass it explicitly via `--config`.

---

## Start the tunnel

On the ASUS machine, from the repo root:

```bash
make judge0-tunnel
# equivalent to: ngrok start --config ngrok.yml judge0
```

Or start manually:

```bash
ngrok start --config ngrok.yml judge0
```

Successful output:

```
Session Status: online
Account:        your@email.com
Region:         ...
Latency:        ...
Web Interface:  http://127.0.0.1:4040
Forwarding:     https://unkind-freeware-unmoved.ngrok-free.dev -> http://localhost:2358
```

---

## Verify Judge0 is reachable

```bash
curl https://unkind-freeware-unmoved.ngrok-free.dev/about
# should return {"version":"1.x.x",...}
```

Or:

```bash
make production-health
# Judge0 (ngrok): ✓ v1.x.x
```

---

## Domain

The static domain `unkind-freeware-unmoved.ngrok-free.dev` is registered on the ngrok account.
It does not change when the tunnel restarts — the desktop app and API have it baked in.

To see active tunnels:

```bash
make ngrok-urls       # calls ngrok API at localhost:4040
make ngrok-inspect    # open http://localhost:4040 in browser
```

---

## .env references

The domain is referenced in:

| File | Variable | Value |
|---|---|---|
| `apps/api/.env` | `JUDGE0_URL` | `https://unkind-freeware-unmoved.ngrok-free.dev` |
| `apps/desktop/.env` | `VITE_JUDGE0_URL` | `https://unkind-freeware-unmoved.ngrok-free.dev` |
| `ngrok.yml` | `domain:` | `unkind-freeware-unmoved.ngrok-free.dev` |

These are also set as GitHub secrets (`JUDGE0_URL`) and Fly.io secrets for CI and production.
