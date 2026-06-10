# Linux Local Setup — SecureAssess

For Ubuntu 22.04+ / Debian 12+ / Linux Mint 21+. Commands use `apt` — adjust for other distros.

> This guide also covers setting up the **ASUS TUF F17 (Linux Mint)** machine that runs Judge0 in production. The [Judge0 section](#optional-judge0--ngrok-asus-machine-only) is only relevant for that machine.

---

## 1. Required Tools

### System packages

```bash
sudo apt update
sudo apt install -y \
    build-essential curl wget git \
    libssl-dev pkg-config \
    libgtk-3-dev libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev librsvg2-dev \
    libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
```

The `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, and related packages are **required by Tauri** to compile the desktop app on Linux. Without them, `cargo tauri dev` will fail with missing header errors.

> On Ubuntu 22.04, the WebKit package name is `libwebkit2gtk-4.0-dev`. On 24.04+/Mint 22+, it's `libwebkit2gtk-4.1-dev`. Install whichever your distro has.

### Node.js 20+

```bash
# Using NodeSource (recommended over apt's outdated version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v20.x or later
```

### pnpm 9

```bash
npm install -g pnpm@9.15.0
pnpm --version   # 9.15.0
```

### Python 3.12

```bash
# Ubuntu 22.04 ships 3.10 — add deadsnakes PPA for 3.12
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3.12-dev

python3.12 --version   # 3.12.x
```

> On Ubuntu 24.04 or Linux Mint 22+, Python 3.12 is available in the default repos:
> `sudo apt install python3.12 python3.12-venv`

### Rust (stable)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustc --version   # 1.77.x or later
```

### Tauri CLI v2

```bash
cargo install tauri-cli --version "^2.0"
cargo tauri --version   # tauri-cli 2.x
```

---

## 2. Clone and Install

```bash
git clone https://github.com/Haseeb420/secureassess.git
cd secureassess

# Install all JS/TS dependencies
pnpm install

# Set up the Python virtual environment
make setup-python
# or manually:
cd apps/api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

---

## 3. Environment Files

The `.env` files are already populated with local dev values. The Supabase project is shared — local dev points to the same database as production.

```bash
# Verify all required vars are set
make env-check
```

If you cloned fresh and `.env` files don't exist yet:
```bash
cp apps/desktop/.env.example apps/desktop/.env
cp apps/api/.env.example      apps/api/.env
cp apps/admin/.env.local.example apps/admin/.env.local
```

Then fill in the Supabase values from **Supabase dashboard → Project Settings → API**.

---

## 4. Run the Apps

### All apps at once

```bash
make dev
```

Starts admin (`:3000`), desktop Vite (`:5173`), and API (`:8000`) in parallel.

### Individual apps

```bash
make dev-admin          # Admin dashboard → http://localhost:3000
make dev-api            # FastAPI → http://localhost:8000 (docs at /docs)
make dev-desktop-vite   # Desktop React only → http://localhost:5173
```

### Desktop app with native Tauri window

```bash
# Terminal 1 — wait for "ready in Xms"
pnpm --filter desktop dev

# Terminal 2
pnpm --filter desktop tauri dev
```

---

## 5. Code Execution

By default `EXECUTION_BACKEND=local` is set in the `.env` files, meaning candidate code runs directly on your Linux machine using installed runtimes.

Alternatively, you can point at the Judge0 instance running on the ASUS machine:
```bash
# apps/api/.env
EXECUTION_BACKEND=judge0
JUDGE0_URL=https://unkind-freeware-unmoved.ngrok-free.dev

# apps/desktop/.env
VITE_EXECUTION_BACKEND=judge0
VITE_JUDGE0_URL=https://unkind-freeware-unmoved.ngrok-free.dev
```

---

## 6. Optional Tools

### Optional: Local PostgreSQL

Only needed if you want a local database instead of pointing at the shared Supabase cloud project.

**Option A — Native (recommended):**
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql   # auto-start on boot
make db-setup
```

**Option B — Docker:**
```bash
sudo apt install -y docker.io
sudo systemctl start docker
sudo usermod -aG docker $USER   # add yourself to docker group (re-login after)
make db-setup-docker
```

Update `DATABASE_URL` in `apps/api/.env`:
```
DATABASE_URL=postgresql://secureassess:secureassess@localhost:5432/secureassess
```

### Optional: Language Runtimes (for LocalExecutor)

Only needed if `EXECUTION_BACKEND=local` and you want to test languages beyond Python and Node.

```bash
# Java 21
sudo apt install -y default-jdk
java --version

# Go 1.22+
sudo apt install -y golang-go
go version

# C/C++ — already installed with build-essential
g++ --version
```

### Optional: GitHub CLI

```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install -y gh
gh auth login
```

### Optional: fly CLI

```bash
make fly-install
# then add to ~/.bashrc or ~/.zshrc:
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"
source ~/.bashrc
make fly-login
```

---

## 7. Optional: Judge0 + ngrok (ASUS machine only)

**Only set this up on the ASUS TUF F17 (Linux Mint).** Do not run Judge0 on your dev machine.

### Install Docker

```bash
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
```

### Run Judge0

```bash
# From the repo root (or wherever judge0 docker-compose.yml lives)
docker compose up -d judge0
# Verify it's up:
curl http://localhost:2358/about
```

### Install ngrok

```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
    | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
    | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install -y ngrok
```

### Start the tunnel

```bash
# Set your ngrok auth token
export NGROK_AUTHTOKEN=<your_token>

# Start the Judge0 tunnel
make judge0-tunnel
# or: ngrok start --config ngrok.yml judge0
```

This exposes Judge0 at:
```
https://unkind-freeware-unmoved.ngrok-free.dev → localhost:2358
```

To keep the tunnel running after logout, run it in a tmux session or as a systemd service.

### Auto-start on boot (systemd)

```bash
# /etc/systemd/system/judge0-ngrok.service
[Unit]
Description=Judge0 ngrok tunnel
After=network.target docker.service

[Service]
User=<your_user>
Environment="NGROK_AUTHTOKEN=<your_token>"
ExecStart=/usr/local/bin/ngrok start --config /path/to/secureassess/ngrok.yml judge0
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable judge0-ngrok
sudo systemctl start judge0-ngrok
```

---

## 8. Verify Everything Works

```bash
make check-deps    # pnpm, cargo, python, node all found
make env-check     # all required env vars set
make dev-api       # FastAPI starts on :8000 — visit http://localhost:8000/docs
make dev-admin     # Admin dashboard starts on :3000
```

---

## 9. Common Errors on Linux

**Tauri build: "Package webkit2gtk-4.1 was not found"**
```bash
sudo apt install libwebkit2gtk-4.1-dev
# On Ubuntu 22.04, try the older variant:
sudo apt install libwebkit2gtk-4.0-dev
```

**Tauri build: "Package libsoup-3.0 was not found"**
```bash
sudo apt install libsoup-3.0-dev libsoup2.4-dev
```

**Rust build: "linker cc not found"**
```bash
sudo apt install build-essential
```

**`cargo tauri: command not found`**
```bash
cargo install tauri-cli --version "^2.0"
source ~/.cargo/env   # make sure ~/.cargo/bin is in PATH
```

**`pnpm install` lockfile error**
```bash
pnpm --version   # must be 9.x
npm install -g pnpm@9.15.0
pnpm install
```

**`ModuleNotFoundError` when running the API**
```bash
source apps/api/.venv/bin/activate   # venv must be active
```

**`ValueError: Missing required environment variables`**

Check `apps/api/.env` has non-empty `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_JWT_SECRET`.

**PostgreSQL: "peer authentication failed"**
```bash
# On Linux, psql defaults to peer auth — connect as postgres superuser first
sudo -u postgres psql -c "CREATE ROLE secureassess WITH LOGIN PASSWORD 'secureassess';"
sudo -u postgres psql -c "CREATE DATABASE secureassess OWNER secureassess;"
# Or just run:
make db-setup   # handles this automatically
```

**Docker: "permission denied" on docker socket**
```bash
sudo usermod -aG docker $USER
# Log out and back in, then retry
```
