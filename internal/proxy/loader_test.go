package proxy

import "testing"

func TestParseProxyLineParsesDocumentedHostPort(t *testing.T) {
	got := parseProxyLine("proxy.example.com:8080")

	if got.Protocol != "http" {
		t.Fatalf("Protocol = %q, want http", got.Protocol)
	}
	if got.Host != "proxy.example.com" {
		t.Fatalf("Host = %q, want proxy.example.com", got.Host)
	}
	if got.Port != 8080 {
		t.Fatalf("Port = %d, want 8080", got.Port)
	}
}
