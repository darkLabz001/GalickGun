package engine

import (
	"fmt"
	"time"
)

const (
	MaxDuration   = time.Hour
	MaxPacketSize = 1024 * 1024
	MaxThreads    = 256
)

// ValidateParams rejects values that would panic the scheduler or create an
// invalid attack lifecycle.
func ValidateParams(params AttackParams) error {
	if params.TargetNode.Host == "" {
		return fmt.Errorf("target host is required")
	}
	if params.TargetNode.Port < 1 || params.TargetNode.Port > 65535 {
		return fmt.Errorf("target port must be between 1 and 65535")
	}
	if params.Duration <= 0 || params.Duration > MaxDuration {
		return fmt.Errorf("duration must be greater than zero and at most %s", MaxDuration)
	}
	if params.PacketDelay <= 0 {
		return fmt.Errorf("packet delay must be greater than zero")
	}
	if params.PacketSize <= 0 || params.PacketSize > MaxPacketSize {
		return fmt.Errorf("packet size must be between 1 and %d bytes", MaxPacketSize)
	}
	if params.Threads < 0 || params.Threads > MaxThreads {
		return fmt.Errorf("threads must be between 0 and %d", MaxThreads)
	}
	return nil
}
