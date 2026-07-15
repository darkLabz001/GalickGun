package config

import (
	"os"

	"github.com/pelletier/go-toml/v2"
)

type Config struct {
	ProxiesFile    string `toml:"proxies_file" default:"data/proxies.txt"`
	UserAgentsFile string `toml:"user_agents_file" default:"data/uas.txt"`
	ServerPort     int    `toml:"server_port" default:"3000"`
	AllowedOrigin  string `toml:"allowed_origin" default:"http://localhost:5173"`
}

func Load(path string) (*Config, error) {
	config := &Config{
		ProxiesFile:    "data/proxies.txt",
		UserAgentsFile: "data/uas.txt",
		ServerPort:     3000,
		AllowedOrigin:  "http://localhost:5173",
	}

	if path == "" {
		return config, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return config, nil
	}

	if err := toml.Unmarshal(data, config); err != nil {
		return nil, err
	}

	return config, nil
}
