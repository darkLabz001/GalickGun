package config

import (
	"path/filepath"
	"testing"
)

func TestLoadDefaultsToLoopback(t *testing.T) {
	cfg, err := Load("")
	if err != nil {
		t.Fatalf("Load defaults: %v", err)
	}
	if cfg.ServerHost != "127.0.0.1" {
		t.Fatalf("ServerHost = %q, want 127.0.0.1", cfg.ServerHost)
	}
}

func TestLoadReturnsErrorForMissingExplicitPath(t *testing.T) {
	path := filepath.Join(t.TempDir(), "missing.toml")
	if _, err := Load(path); err == nil {
		t.Fatal("Load accepted a missing explicit configuration path")
	}
}

func TestLoadAllowsExplicitServerHostOverride(t *testing.T) {
	t.Setenv("GB_SERVER_HOST", "0.0.0.0")
	cfg, err := Load("")
	if err != nil {
		t.Fatalf("Load defaults: %v", err)
	}
	if cfg.ServerHost != "0.0.0.0" {
		t.Fatalf("ServerHost = %q, want explicit override", cfg.ServerHost)
	}
}

func TestLoadAllowsExplicitServerPortOverride(t *testing.T) {
	t.Setenv("GB_SERVER_PORT", "3100")
	cfg, err := Load("")
	if err != nil {
		t.Fatalf("Load defaults: %v", err)
	}
	if cfg.ServerPort != 3100 {
		t.Fatalf("ServerPort = %d, want explicit override", cfg.ServerPort)
	}
}
