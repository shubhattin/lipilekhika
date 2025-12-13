package scriptdata

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
	"sync"
)

type Loader struct {
	fs fs.FS

	mu    sync.RWMutex
	cache map[string]*ScriptData
}

func NewLoader(fsys fs.FS) *Loader {
	return &Loader{
		fs:    fsys,
		cache: map[string]*ScriptData{},
	}
}

func (l *Loader) LoadScriptData(scriptName string) (*ScriptData, error) {
	l.mu.RLock()
	if v := l.cache[scriptName]; v != nil {
		l.mu.RUnlock()
		return v, nil
	}
	l.mu.RUnlock()

	// normalize to exact JSON name, caller should already pass canonical ScriptName
	p := filepath.ToSlash(filepath.Join("data", "script_data", scriptName+".json"))
	b, err := fs.ReadFile(l.fs, p)
	if err != nil {
		return nil, fmt.Errorf("read script data %q: %w", scriptName, err)
	}
	var sd ScriptData
	if err := json.Unmarshal(b, &sd); err != nil {
		return nil, fmt.Errorf("parse script data %q: %w", scriptName, err)
	}
	if strings.TrimSpace(sd.ScriptName) == "" {
		sd.ScriptName = scriptName
	}

	l.mu.Lock()
	l.cache[scriptName] = &sd
	l.mu.Unlock()
	return &sd, nil
}
