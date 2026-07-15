package api

import "testing"

func validStartRequest() StartAttackRequest {
	return StartAttackRequest{
		Target:       "http://localhost:8080",
		AttackMethod: "http_flood",
		DurationSec:  30,
		PacketDelay:  100,
		PacketSize:   64,
		Threads:      4,
	}
}

func TestValidateStartAttackRequestRejectsUnsafeInput(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*StartAttackRequest)
	}{
		{name: "empty target", mutate: func(request *StartAttackRequest) { request.Target = "" }},
		{name: "unknown method", mutate: func(request *StartAttackRequest) { request.AttackMethod = "unknown" }},
		{name: "negative duration", mutate: func(request *StartAttackRequest) { request.DurationSec = -1 }},
		{name: "excessive duration", mutate: func(request *StartAttackRequest) { request.DurationSec = 3601 }},
		{name: "zero delay", mutate: func(request *StartAttackRequest) { request.PacketDelay = 0 }},
		{name: "excessive packet size", mutate: func(request *StartAttackRequest) { request.PacketSize = 1024*1024 + 1 }},
		{name: "excessive threads", mutate: func(request *StartAttackRequest) { request.Threads = 257 }},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := validStartRequest()
			test.mutate(&request)
			if err := ValidateStartAttackRequest(request); err == nil {
				t.Fatalf("ValidateStartAttackRequest accepted %s", test.name)
			}
		})
	}
}

func TestValidateStartAttackRequestAcceptsDefaults(t *testing.T) {
	if err := ValidateStartAttackRequest(validStartRequest()); err != nil {
		t.Fatalf("ValidateStartAttackRequest rejected defaults: %v", err)
	}
}
