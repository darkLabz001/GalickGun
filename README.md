# GalaticBlast

<p align="center">
  <img src="web-client/public/gun.png" alt="GalaticBlast" width="128" />
</p>

<h3 align="center">Network Stress Testing Tool</h3>

<p align="center">
  A professional network stress testing tool with a web-based UI and CLI interface.
  Built with Go backend, React frontend, and real-time Socket.IO communication.
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
go build -o bin/gb-server ./cmd/gb-server
go build -o bin/gb-cli ./cmd/gb-cli
```

### Run the web server

```bash
./bin/gb-server
# Open http://localhost:3000
```

### Run the CLI

```bash
./bin/gb-cli attack http_flood http://target.com -d 30 -s 64 -t 4 -v
```

### Docker

```bash
docker build -t galaticblast .
docker run -p 3000:3000 galaticblast
```

## CLI Usage

```
gb-cli attack [method] [target] [flags]

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

## Configuration

### Config file (TOML)

```toml
proxies_file = "data/proxies.txt"
user_agents_file = "data/uas.txt"
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
| `ALLOW_NO_PROXY=true` | Allow attacks without proxies |

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
