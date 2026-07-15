package proxy

import (
	"bufio"
	"os"
	"strconv"
	"strings"

	"github.com/galaticBlast/galaticBlast/internal/engine"
)

func LoadProxies(filepath string) ([]engine.Proxy, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var proxies []engine.Proxy
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		proxy := parseProxyLine(line)
		if proxy.Host != "" {
			proxies = append(proxies, proxy)
		}
	}

	return proxies, scanner.Err()
}

func parseProxyLine(line string) engine.Proxy {
	proxy := engine.Proxy{}

	if idx := strings.Index(line, "://"); idx != -1 {
		proxy.Protocol = line[:idx]
		line = line[idx+3:]
	} else {
		proxy.Protocol = "http"
	}

	if atIdx := strings.Index(line, "@"); atIdx != -1 {
		userInfo := line[:atIdx]
		line = line[atIdx+1:]

		if colonIdx := strings.Index(userInfo, ":"); colonIdx != -1 {
			proxy.Username = userInfo[:colonIdx]
			proxy.Password = userInfo[colonIdx+1:]
		} else {
			proxy.Username = userInfo
		}
	}

	hostPart := line
	portStr := "80"

	if colonIdx := strings.LastIndex(hostPart, ":"); colonIdx != -1 {
		hostPart = hostPart[:colonIdx]
		portStr = hostPart[colonIdx+1:]
	}

	proxy.Host = hostPart
	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 80
	}
	proxy.Port = port

	return proxy
}

func LoadUserAgents(filepath string) ([]string, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var uas []string
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" && !strings.HasPrefix(line, "#") {
			uas = append(uas, line)
		}
	}

	return uas, scanner.Err()
}

func FilterByMethod(proxies []engine.Proxy, method engine.AttackKind) []engine.Proxy {
	allowed := map[engine.AttackKind][]string{
		engine.HTTPFlood:     {"http", "https", "socks4", "socks5"},
		engine.HTTPBypass:    {"http", "https", "socks4", "socks5"},
		engine.HTTPSlowloris: {"socks4", "socks5"},
		engine.TCPFlood:      {"socks4", "socks5"},
		engine.MinecraftPing: {"socks4", "socks5"},
	}

	protocols, ok := allowed[method]
	if !ok {
		return proxies
	}

	var filtered []engine.Proxy
	for _, p := range proxies {
		for _, proto := range protocols {
			if p.Protocol == proto {
				filtered = append(filtered, p)
				break
			}
		}
	}

	return filtered
}
