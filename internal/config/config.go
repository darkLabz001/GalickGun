package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/pelletier/go-toml/v2"
)

type Config struct {
	ProxiesFile    string `toml:"proxies_file" default:"data/proxies.txt"`
	UserAgentsFile string `toml:"user_agents_file" default:"data/uas.txt"`
	ServerHost     string `toml:"server_host" default:"127.0.0.1"`
	ServerPort     int    `toml:"server_port" default:"3000"`
	AllowedOrigin  string `toml:"allowed_origin" default:"http://localhost:5173"`
}

func Load(path string) (*Config, error) {
	config := &Config{
		ProxiesFile:    "data/proxies.txt",
		UserAgentsFile: "data/uas.txt",
		ServerHost:     "127.0.0.1",
		ServerPort:     3000,
		AllowedOrigin:  "http://localhost:5173",
	}

	if path == "" {
		if err := applyEnvironment(config); err != nil {
			return nil, err
		}
		return config, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %q: %w", path, err)
	}

	if err := toml.Unmarshal(data, config); err != nil {
		return nil, err
	}

	if err := applyEnvironment(config); err != nil {
		return nil, err
	}
	return config, nil
}

func applyEnvironment(config *Config) error {
	if host := os.Getenv("GB_SERVER_HOST"); host != "" {
		config.ServerHost = host
	}
	if value := os.Getenv("GB_SERVER_PORT"); value != "" {
		port, err := strconv.Atoi(value)
		if err != nil || port < 1 || port > 65535 {
			return fmt.Errorf("GB_SERVER_PORT must be between 1 and 65535")
		}
		config.ServerPort = port
	}
	return nil
}
