package engine

import (
	"context"
	"testing"
	"time"
)

type noopWorker struct{}

func (noopWorker) Fire(context.Context, AttackParams, Proxy, string, chan<- AttackStats) error {
	return nil
}

func TestStartRejectsInvalidParamsBeforeLaunching(t *testing.T) {
	eng := NewEngine()
	eng.Registry().Register(HTTPFlood, noopWorker{})
	params := validTestParams()
	params.PacketDelay = 0

	if instance := eng.Start("invalid", params, nil, nil); instance != nil {
		t.Fatal("Start returned an instance for invalid parameters")
	}
	if _, exists := eng.attacks["invalid"]; exists {
		t.Fatal("Start retained an invalid attack in the engine")
	}
}

func TestStartDoesNotRetainUnknownMethod(t *testing.T) {
	eng := NewEngine()
	params := validTestParams()
	params.Method = AttackKind("unknown")

	if instance := eng.Start("unknown", params, nil, nil); instance != nil {
		t.Fatal("Start returned an instance for an unknown method")
	}
	if _, exists := eng.attacks["unknown"]; exists {
		t.Fatal("Start retained an unknown method in the engine")
	}
}

type logsAfterCancellationWorker struct{}

func (logsAfterCancellationWorker) Fire(ctx context.Context, params AttackParams, proxy Proxy, userAgent string, logCh chan<- AttackStats) error {
	<-ctx.Done()
	time.Sleep(10 * time.Millisecond)
	SendAttackLogIfVerbose(true, logCh, "worker stopped")
	return nil
}

func TestStatsChannelWaitsForInFlightWorkers(t *testing.T) {
	eng := NewEngine()
	eng.Registry().Register(HTTPFlood, logsAfterCancellationWorker{})
	params := validTestParams()
	params.Duration = 15 * time.Millisecond
	params.PacketDelay = 5 * time.Millisecond
	params.Threads = 1

	instance := eng.Start("lifecycle", params, []Proxy{{Host: "proxy", Port: 8080}}, nil)
	if instance == nil {
		t.Fatal("Start returned nil for valid parameters")
	}

	for range instance.StatsCh {
	}
	time.Sleep(30 * time.Millisecond)
	// A send on a prematurely closed channel happens in a worker goroutine and
	// crashes the test process. Reaching this point proves shutdown was joined.
}
