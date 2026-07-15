package main

import "testing"

func TestSocketConnectionIDHandlesNilConnection(t *testing.T) {
	if got := socketConnectionID(nil); got != "" {
		t.Fatalf("socketConnectionID(nil) = %q, want empty string", got)
	}
}
