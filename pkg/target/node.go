package target

import (
	"strconv"
	"strings"

	"github.com/galaticBlast/galaticBlast/internal/engine"
)

func ParseTarget(raw string) engine.TargetNode {
	raw = strings.TrimSpace(raw)

	node := engine.TargetNode{Raw: raw}

	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		node.IsURL = true
		return parseURL(raw)
	}

	if idx := strings.Index(raw, ":"); idx != -1 {
		host := raw[:idx]
		portStr := raw[idx+1:]
		port, err := strconv.Atoi(portStr)
		if err != nil {
			port = 80
		}
		return engine.TargetNode{
			Raw:  raw,
			Host: host,
			Port: port,
		}
	}

	return engine.TargetNode{
		Raw:  raw,
		Host: raw,
		Port: 80,
	}
}

func parseURL(raw string) engine.TargetNode {
	node := engine.TargetNode{Raw: raw, IsURL: true}

	afterScheme := raw
	if strings.HasPrefix(raw, "https://") {
		node.Scheme = "https"
		afterScheme = raw[8:]
	} else {
		node.Scheme = "http"
		afterScheme = raw[7:]
	}

	hostPart := afterScheme
	pathPart := ""
	queryPart := ""

	if idx := strings.Index(afterScheme, "/"); idx != -1 {
		hostPart = afterScheme[:idx]
		rest := afterScheme[idx:]

		if qIdx := strings.Index(rest, "?"); qIdx != -1 {
			pathPart = rest[:qIdx]
			queryPart = rest[qIdx:]
		} else {
			pathPart = rest
		}
	}

	node.Host = hostPart
	node.Path = pathPart
	node.Query = queryPart

	if colonIdx := strings.LastIndex(hostPart, ":"); colonIdx != -1 {
		portStr := hostPart[colonIdx+1:]
		port, err := strconv.Atoi(portStr)
		if err == nil {
			node.Port = port
			node.Host = hostPart[:colonIdx]
		}
	}

	if node.Port == 0 {
		if node.Scheme == "https" {
			node.Port = 443
		} else {
			node.Port = 80
		}
	}

	return node
}
