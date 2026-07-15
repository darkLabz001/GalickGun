package netutil

import (
	"bufio"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/galaticBlast/galaticBlast/internal/engine"
	"h12.io/socks"
)

func DialedHTTPClient(proxy engine.Proxy, timeout time.Duration, maxRedirects int) *http.Client {
	transport := &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		IdleConnTimeout:     90 * time.Second,
	}

	if proxy.Host != "" {
		proxyURL := buildProxyURL(proxy)
		transport.Proxy = http.ProxyURL(proxyURL)
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   timeout,
	}

	if maxRedirects > 0 {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return fmt.Errorf("too many redirects")
			}
			return nil
		}
	} else {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	}

	return client
}

func DialedMimicHTTPClient(proxy engine.Proxy, timeout time.Duration) *http.Client {
	client := DialedHTTPClient(proxy, timeout, 0)
	return client
}

func SetMimicHeaders(req *http.Request, ua string) {
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Sec-Fetch-User", "?1")

	if ua != "" {
		req.Header.Set("User-Agent", ua)
	}
}

func DialedTCPClient(scheme string, host string, port int, proxy engine.Proxy) (net.Conn, error) {
	address := fmt.Sprintf("%s:%d", host, port)

	if proxy.Host == "" {
		return dialDirect(scheme, address)
	}

	switch proxy.Protocol {
	case "socks4", "socks5":
		return dialViaSOCKS(scheme, address, proxy)
	case "http", "https":
		return dialViaHTTPConnect(scheme, address, proxy)
	default:
		return dialDirect(scheme, address)
	}
}

func dialDirect(scheme string, address string) (net.Conn, error) {
	dialer := &net.Dialer{
		Timeout:   10 * time.Second,
		KeepAlive: 30 * time.Second,
	}

	conn, err := dialer.Dial("tcp", address)
	if err != nil {
		return nil, err
	}

	if scheme == "tls" || scheme == "https" {
		tlsConn := tls.Client(conn, &tls.Config{
			InsecureSkipVerify: true,
		})
		if err := tlsConn.Handshake(); err != nil {
			conn.Close()
			return nil, err
		}
		return tlsConn, nil
	}

	return conn, nil
}

func dialViaSOCKS(scheme string, address string, proxy engine.Proxy) (net.Conn, error) {
	proxyAddr := fmt.Sprintf("%s:%d", proxy.Host, proxy.Port)
	proxyURL := fmt.Sprintf("socks5://%s", proxyAddr)

	dialer := socks.Dial(proxyURL)
	conn, err := dialer("tcp", address)
	if err != nil {
		return nil, err
	}

	if scheme == "tls" || scheme == "https" {
		tlsConn := tls.Client(conn, &tls.Config{
			InsecureSkipVerify: true,
		})
		if err := tlsConn.Handshake(); err != nil {
			conn.Close()
			return nil, err
		}
		return tlsConn, nil
	}

	return conn, nil
}

func dialViaHTTPConnect(scheme string, address string, proxy engine.Proxy) (net.Conn, error) {
	proxyAddr := fmt.Sprintf("%s:%d", proxy.Host, proxy.Port)

	dialer := &net.Dialer{
		Timeout: 10 * time.Second,
	}
	conn, err := dialer.Dial("tcp", proxyAddr)
	if err != nil {
		return nil, err
	}

	connectReq := fmt.Sprintf("CONNECT %s HTTP/1.1\r\nHost: %s\r\n", address, address)
	if proxy.Username != "" {
		auth := proxy.Username + ":" + proxy.Password
		connectReq += fmt.Sprintf("Proxy-Authorization: Basic %s\r\n", encodeBasicAuth(auth))
	}
	connectReq += "\r\n"

	if _, err := conn.Write([]byte(connectReq)); err != nil {
		conn.Close()
		return nil, err
	}

	br := bufio.NewReader(conn)
	resp, err := http.ReadResponse(br, nil)
	if err != nil {
		conn.Close()
		return nil, err
	}
	if resp.StatusCode != 200 {
		conn.Close()
		return nil, fmt.Errorf("CONNECT failed: %d", resp.StatusCode)
	}

	if scheme == "tls" || scheme == "https" {
		tlsConn := tls.Client(conn, &tls.Config{
			InsecureSkipVerify: true,
		})
		if err := tlsConn.Handshake(); err != nil {
			conn.Close()
			return nil, err
		}
		return tlsConn, nil
	}

	return conn, nil
}

func buildProxyURL(proxy engine.Proxy) *url.URL {
	scheme := proxy.Protocol
	if scheme == "" {
		scheme = "http"
	}

	u := &url.URL{
		Scheme: scheme,
		Host:   fmt.Sprintf("%s:%d", proxy.Host, proxy.Port),
	}

	if proxy.Username != "" {
		u.User = url.UserPassword(proxy.Username, proxy.Password)
	}

	return u
}

func encodeBasicAuth(auth string) string {
	return base64.StdEncoding.EncodeToString([]byte(auth))
}
