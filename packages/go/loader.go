package lipilekhika

import (
	"fmt"
	"sync"

	"lipilekhika/scriptdata"
)

var (
	scriptLoader = scriptdata.NewLoader(embeddedData)

	customOptionsOnce sync.Once
	customOptions     customOptionsMap
	customOptionsErr  error
)

func getCustomOptions() (customOptionsMap, error) {
	customOptionsOnce.Do(func() {
		customOptions, customOptionsErr = loadCustomOptions(embeddedData)
	})
	return customOptions, customOptionsErr
}

func getScriptData(scriptName string) (*scriptdata.ScriptData, error) {
	sd, err := scriptLoader.LoadScriptData(scriptName)
	if err != nil {
		return nil, err
	}
	if sd == nil {
		return nil, fmt.Errorf("script data not found: %s", scriptName)
	}
	return sd, nil
}
