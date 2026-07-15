package api

type StartAttackRequest struct {
	Target       string `json:"target"`
	AttackMethod string `json:"attackMethod"`
	DurationSec  int    `json:"duration"`
	PacketDelay  int    `json:"packetDelay"`
	PacketSize   int    `json:"packetSize"`
	Threads      int    `json:"threads"`
}

type ConfigurationResponse struct {
	Proxies string `json:"proxies"`
	UAs     string `json:"uas"`
}

type StatsPayload struct {
	Timestamp    int64  `json:"timestamp"`
	PPS          int64  `json:"pps"`
	TotalPackets int64  `json:"totalPackets"`
	Proxies      int    `json:"proxies"`
	Log          string `json:"log"`
}

type AttackListResponse struct {
	Attacks []string `json:"attacks"`
}

type AttackAcceptedResponse struct {
	OK      bool   `json:"ok"`
	Proxies int    `json:"proxies"`
	Message string `json:"message,omitempty"`
}
