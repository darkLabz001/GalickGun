package http

import (
	"math/rand"
	"strings"
)

func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

func generateResourcePath() string {
	extensions := []string{".js", ".css", ".png", ".jpg", ".gif", ".svg", ".ico", ".woff", ".ttf"}
	pathParts := []string{"assets", "static", "images", "css", "js", "media", "fonts", "data"}

	path := "/"
	path += pathParts[rand.Intn(len(pathParts))]
	path += "/"
	path += generateRandomString(8)
	path += extensions[rand.Intn(len(extensions))]

	return path
}

func generateQueryParams() string {
	params := []string{"_", "v", "t", "id", "cb", "nocache", "rand"}
	values := []string{}

	for i := 0; i < rand.Intn(3)+1; i++ {
		param := params[rand.Intn(len(params))]
		value := generateRandomString(8)
		values = append(values, param+"="+value)
	}

	return "?" + strings.Join(values, "&")
}
