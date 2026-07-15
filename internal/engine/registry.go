package engine

import "sync"

type Registry struct {
	mu sync.RWMutex
	m  map[AttackKind]AttackWorker
}

func NewRegistry() Registry {
	return Registry{
		m: make(map[AttackKind]AttackWorker),
	}
}

func (r *Registry) Register(kind AttackKind, worker AttackWorker) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.m[kind] = worker
}

func (r *Registry) Get(kind AttackKind) (AttackWorker, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	w, ok := r.m[kind]
	return w, ok
}

func (r *Registry) ListKinds() []AttackKind {
	r.mu.RLock()
	defer r.mu.RUnlock()
	kinds := make([]AttackKind, 0, len(r.m))
	for k := range r.m {
		kinds = append(kinds, k)
	}
	return kinds
}
