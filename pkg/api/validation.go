package api

import (
	"fmt"
	"strings"

	"github.com/galaticBlast/galaticBlast/internal/engine"
)

const (
	maxTargetLength = 2048
	maxDelayMillis  = 60_000
	maxDurationSecs = 3600
)

var supportedAttackMethods = map[string]struct{}{
	string(engine.HTTPFlood):     {},
	string(engine.HTTPBypass):    {},
	string(engine.HTTPSlowloris): {},
	string(engine.TCPFlood):      {},
	string(engine.MinecraftPing): {},
}

func ValidateStartAttackRequest(request StartAttackRequest) error {
	target := strings.TrimSpace(request.Target)
	if target == "" {
		return fmt.Errorf("target is required")
	}
	if len(target) > maxTargetLength {
		return fmt.Errorf("target must not exceed %d characters", maxTargetLength)
	}
	if _, ok := supportedAttackMethods[request.AttackMethod]; !ok {
		return fmt.Errorf("unsupported attack method %q", request.AttackMethod)
	}
	if request.DurationSec < 1 || request.DurationSec > maxDurationSecs {
		return fmt.Errorf("duration must be between 1 and %d seconds", maxDurationSecs)
	}
	if request.PacketDelay < 1 || request.PacketDelay > maxDelayMillis {
		return fmt.Errorf("packet delay must be between 1 and %d milliseconds", maxDelayMillis)
	}
	if request.PacketSize < 1 || request.PacketSize > engine.MaxPacketSize {
		return fmt.Errorf("packet size must be between 1 and %d bytes", engine.MaxPacketSize)
	}
	if request.Threads < 0 || request.Threads > engine.MaxThreads {
		return fmt.Errorf("threads must be between 0 and %d", engine.MaxThreads)
	}
	return nil
}
