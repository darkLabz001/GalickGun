package main

import (
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"

	"github.com/galaticBlast/galaticBlast/internal/attacks/game"
	httpattacks "github.com/galaticBlast/galaticBlast/internal/attacks/http"
	"github.com/galaticBlast/galaticBlast/internal/attacks/tcp"
	"github.com/galaticBlast/galaticBlast/internal/config"
	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/internal/proxy"
	"github.com/galaticBlast/galaticBlast/pkg/api"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog/log"
)

func main() {
	cfg, err := config.Load("")
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	eng := engine.NewEngine()
	registerWorkers(eng.Registry())

	proxies, err := proxy.LoadProxies(cfg.ProxiesFile)
	if err != nil {
		log.Warn().Err(err).Msg("could not load proxies")
		proxies = []engine.Proxy{}
	}

	userAgents, err := proxy.LoadUserAgents(cfg.UserAgentsFile)
	if err != nil {
		log.Warn().Err(err).Msg("could not load user agents")
		userAgents = []string{"GalickGun/1.0"}
	}

	control := newControlServer(eng, proxies, userAgents)

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{cfg.AllowedOrigin},
		AllowMethods: []string{echo.GET, echo.POST, echo.OPTIONS, echo.PUT, echo.DELETE},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, "*"},
	}))

	e.POST("/api/attacks/start", control.start)
	e.POST("/api/attacks/stop", control.stop)
	e.GET("/api/events", control.stream)

	e.GET("/attacks", func(c echo.Context) error {
		kinds := eng.Registry().ListKinds()
		attacks := make([]string, len(kinds))
		for i, k := range kinds {
			attacks[i] = string(k)
		}
		return c.JSON(http.StatusOK, api.AttackListResponse{Attacks: attacks})
	})

	e.GET("/configuration", func(c echo.Context) error {
		proxiesData, _ := os.ReadFile(cfg.ProxiesFile)
		uasData, _ := os.ReadFile(cfg.UserAgentsFile)

		return c.JSON(http.StatusOK, api.ConfigurationResponse{
			Proxies: base64.StdEncoding.EncodeToString(proxiesData),
			UAs:     base64.StdEncoding.EncodeToString(uasData),
		})
	})

	e.POST("/configuration", func(c echo.Context) error {
		var config api.ConfigurationResponse
		if err := c.Bind(&config); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}

		if config.Proxies != "" {
			proxiesData, err := base64.StdEncoding.DecodeString(config.Proxies)
			if err == nil {
				os.WriteFile(cfg.ProxiesFile, proxiesData, 0644)
			}
		}

		if config.UAs != "" {
			uasData, err := base64.StdEncoding.DecodeString(config.UAs)
			if err == nil {
				os.WriteFile(cfg.UserAgentsFile, uasData, 0644)
			}
		}

		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	e.Static("/", "web-client/dist")

	port := cfg.ServerPort
	address := net.JoinHostPort(cfg.ServerHost, strconv.Itoa(port))
	fmt.Printf("GalickGun Server starting on http://%s\n", address)
	e.Logger.Fatal(e.Start(address))
}

func registerWorkers(reg *engine.Registry) {
	reg.Register(engine.HTTPFlood, httpattacks.NewFloodWorker())
	reg.Register(engine.HTTPBypass, httpattacks.NewBypassWorker())
	reg.Register(engine.HTTPSlowloris, httpattacks.NewSlowlorisWorker())
	reg.Register(engine.TCPFlood, tcp.NewFloodWorker())
	reg.Register(engine.MinecraftPing, game.NewMinecraftPingWorker())
}
