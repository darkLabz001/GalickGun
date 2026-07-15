package engine

import (
	"testing"
	"time"
)

func validTestParams() AttackParams {
	return AttackParams{
		Target:      "http://localhost:8080",
		TargetNode:  TargetNode{Host: "localhost", Port: 8080},
		Duration:    30 * time.Second,
		PacketDelay: 100 * time.Millisecond,
		PacketSize:  64,
		Method:      HTTPFlood,
		Threads:     4,
	}
}

func TestValidateParamsRejectsNonPositiveDelay(t *testing.T) {
	params := validTestParams()
	params.PacketDelay = 0

	if err := ValidateParams(params); err == nil {
		t.Fatal("ValidateParams accepted a zero packet delay")
	}
}

func TestValidateParamsRejectsUnsafeBounds(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*AttackParams)
	}{
		{name: "empty target", mutate: func(params *AttackParams) { params.TargetNode.Host = "" }},
		{name: "invalid port", mutate: func(params *AttackParams) { params.TargetNode.Port = 70000 }},
		{name: "non-positive duration", mutate: func(params *AttackParams) { params.Duration = 0 }},
		{name: "excessive duration", mutate: func(params *AttackParams) { params.Duration = time.Hour + time.Second }},
		{name: "non-positive packet size", mutate: func(params *AttackParams) { params.PacketSize = 0 }},
		{name: "excessive packet size", mutate: func(params *AttackParams) { params.PacketSize = 1024*1024 + 1 }},
		{name: "negative threads", mutate: func(params *AttackParams) { params.Threads = -1 }},
		{name: "excessive threads", mutate: func(params *AttackParams) { params.Threads = 257 }},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			params := validTestParams()
			test.mutate(&params)
			if err := ValidateParams(params); err == nil {
				t.Fatalf("ValidateParams accepted %s", test.name)
			}
		})
	}
}

func TestValidateParamsAcceptsSafeDefaults(t *testing.T) {
	if err := ValidateParams(validTestParams()); err != nil {
		t.Fatalf("ValidateParams rejected safe defaults: %v", err)
	}
}
