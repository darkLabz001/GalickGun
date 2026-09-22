# GalickGun

<p align="center">
  <img src="web-client/public/gun.png" alt="GalickGun Vegeta-themed dashboard artwork" width="256" />
</p>

<h3 align="center">Vegeta-Themed Authorized Network Load Testing Tool</h3>

<p align="center">
  A professional network stress testing tool with a web-based UI and CLI interface.
  Built with a Go backend, React frontend, REST control API, and live SSE telemetry.
</p>

---

## Features

- **5 Attack Methods**
  - HTTP Flood - Rapid HTTP GET/POST requests
  - HTTP Bypass - Browser-mimicking requests with realistic headers, cookies, and paths
  - HTTP Slowloris - Slow persistent connections that hold server threads open
  - TCP Flood - Raw TCP packet burst with cryptographic random data
  - Minecraft Ping - Minecraft protocol handshake flood

- **Web Interface** - Real-time stats, terminal-style log, dark hacker theme
- **CLI Interface** - Full-featured command-line tool with verbose output
- **Proxy Support** - HTTP, HTTPS, SOCKS4, SOCKS5 with automatic protocol filtering
- **Multi-threaded** - Configurable thread count with goroutine-based attack engine
- **Real-time Stats** - Live packets/sec, total packets, and proxy count via Socket.IO
- **Docker Ready** - Multi-stage Dockerfile for containerized deployment

## Quick Start

### Build from source

```bash
# Install dependencies and build
make all

# Or manually:
cd web-client && npm install && npm run build && cd ..
go build -o bin/galickgun-server ./cmd/gb-server
go build -o bin/galickgun-cli ./cmd/gb-cli
```

### Run the web server

```bash
./bin/galickgun-server
# Open http://localhost:3000
```

### Run the CLI

```bash
./bin/galickgun-cli attack http_flood http://target.com -d 30 -s 64 -t 4 -v
```

### Docker

```bash
docker build -t galickgun .
docker run -p 3000:3000 galickgun
```

## CLI Usage

```
galickgun-cli attack [method] [target] [flags]

Flags:
  -d, --duration int    Attack duration in seconds (default 30)
  -s, --size int        Packet size in bytes (default 64)
  -D, --delay int       Delay between packets in ms (default 100)
  -t, --threads int     Number of threads (0 = auto)
  -v, --verbose         Verbose output
  -c, --config string   Config file path
```

### Examples

```bash
# HTTP Flood for 60 seconds
./bin/gb-cli attack http_flood http://example.com -d 60

# TCP Flood with 8 threads, verbose
./bin/gb-cli attack tcp_flood 192.168.1.1:8080 -t 8 -v

# Slowloris with large packets
./bin/gb-cli attack http_slowloris http://example.com -d 120 -s 1024
```
<iframe width="560" height="315" src="https://www.youtube.com/embed/2A8b4GozrNY?si=aC6KqOyQYzSj5R1v" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Configuration

### Config file (TOML)

```toml
proxies_file = "data/proxies.txt"
user_agents_file = "data/uas.txt"
server_host = "127.0.0.1"
server_port = 3000
allowed_origin = "http://localhost:5173"
```

### Proxy format

```
protocol://user:password@host:port
protocol://host:port
host:port
host
```

### Environment variables

| Variable | Effect |
|----------|--------|
| `GB_SERVER_HOST=0.0.0.0` | Explicitly expose the web server beyond loopback (Docker sets this automatically) |

The server binds to `127.0.0.1` by default. Only expose it on a trusted network;
the web console can start tests and edit proxy configuration.

### Quality checks

```bash
make check
```

This runs the race-enabled Go test suite, `go vet`, and the complete Go/React build.

## Project Structure

```
galaticBlast/
├── cmd/
│   ├── gb-server/       # Web server (Echo + Socket.IO)
│   └── gb-cli/          # CLI (Cobra)
├── internal/
│   ├── attacks/         # Attack method implementations
│   │   ├── http/        # HTTP Flood, Bypass, Slowloris
│   │   ├── tcp/         # TCP Flood
│   │   └── game/        # Minecraft Ping
│   ├── engine/          # Core attack engine + worker registry
│   ├── netutil/         # Proxy-aware HTTP/TCP client factories
│   ├── config/          # TOML configuration
│   └── proxy/           # Proxy/UA loading + filtering
├── pkg/
│   ├── api/             # Public API types
│   └── target/          # Target URL/host parsing
├── web-client/          # React + Tailwind frontend
├── data/                # Proxy and user agent lists
├── Dockerfile           # Multi-stage Docker build
└── Makefile             # Build automation
```

## Architecture

- **Strategy Pattern** - `AttackWorker` interface with registry-based dispatch
- **Fan-out/Fan-in** - Thread goroutines fan out to individual Fire() goroutines; aggregator collects stats
- **Context-based Cancellation** - Clean lifecycle management for all attack goroutines
- **Proxy Abstraction** - Transparent HTTP CONNECT, SOCKS4/5 tunneling via `netutil` package

## License

MIT
