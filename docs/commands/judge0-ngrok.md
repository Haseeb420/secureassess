# Judge0 & ngrok

Judge0 runs on the **ASUS TUF F17 (Linux Mint)** machine and is exposed via an ngrok static domain. You interact with it via the URL — you do not need to manage it from your dev Mac.

```
https://unkind-freeware-unmoved.ngrok-free.dev → Judge0 :2358 on ASUS
```

---

## Check if Judge0 is online

```bash
make production-health
# or directly:
curl https://unkind-freeware-unmoved.ngrok-free.dev/about
```

A JSON response with `"version"` means it's up. "OFFLINE" means the ASUS machine or tunnel is down.

---

## Commands

| Command | Where to run | What it does |
|---|---|---|
| `make judge0-tunnel` | **ASUS machine** | Start ngrok tunnel exposing Judge0 |
| `make ngrok` | Anywhere | Print instructions for starting the tunnel |
| `make ngrok-urls` | Dev machine | Show live tunnel URLs from running ngrok |
| `make ngrok-inspect` | Dev machine | Open ngrok inspector at http://localhost:4040 |

---

## Starting the tunnel (on ASUS machine)

```bash
make judge0-tunnel
# equivalent to:
ngrok start --config ngrok.yml judge0
```

`ngrok.yml` at the repo root:
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

`NGROK_AUTHTOKEN` must be set in the environment or shell profile on the ASUS machine.

---

## Switching between Judge0 and LocalExecutor

**Use Judge0 (production default):**
```bash
# apps/api/.env
EXECUTION_BACKEND=judge0
JUDGE0_URL=https://unkind-freeware-unmoved.ngrok-free.dev

# apps/desktop/.env
VITE_EXECUTION_BACKEND=judge0
VITE_JUDGE0_URL=https://unkind-freeware-unmoved.ngrok-free.dev
```

**Use LocalExecutor (dev default, required on Apple Silicon):**
```bash
# apps/api/.env
EXECUTION_BACKEND=local

# apps/desktop/.env
VITE_EXECUTION_BACKEND=local
```

> `LocalExecutor` runs candidate code directly on the machine using installed language runtimes. Judge0 Docker cannot run on Apple Silicon (`linux/amd64` image faults under Rosetta 2 nested emulation).
