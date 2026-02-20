package scriptdata

import (
	"bytes"
	"encoding/gob"
	"fmt"
	"slices"
	"strings"
	"sync"

	embedded "github.com/shubhattin/lipilekhika/packages/go/lipilekhika/data"
)

const (
	scriptDataBlobPath    = "gob/script_data.gob"
	scriptListBlobPath    = "gob/script_list.gob"
	customOptionsBlobPath = "gob/custom_options.gob"
)

var (
	scriptDataOnce sync.Once
	scriptDataMap  map[string]ScriptData
	scriptDataErr  error

	scriptListOnce sync.Once
	scriptListData ScriptListData
	scriptListErr  error

	customOptionsOnce sync.Once
	customOptionsMap  map[string]CustomOption
	customOptionsErr  error
)

func loadScriptDataMap() (map[string]ScriptData, error) {
	scriptDataOnce.Do(func() {
		raw, err := embedded.FS.ReadFile(scriptDataBlobPath)
		if err != nil {
			scriptDataErr = fmt.Errorf("read %s: %w", scriptDataBlobPath, err)
			return
		}
		var blob ScriptDataBlob
		if err := gob.NewDecoder(bytes.NewReader(raw)).Decode(&blob); err != nil {
			scriptDataErr = fmt.Errorf("decode %s: %w", scriptDataBlobPath, err)
			return
		}
		scriptDataMap = blob.ToMap()
	})
	return scriptDataMap, scriptDataErr
}

func loadScriptListJSON() error {
	scriptListOnce.Do(func() {
		raw, err := embedded.FS.ReadFile(scriptListBlobPath)
		if err != nil {
			scriptListErr = fmt.Errorf("read %s: %w", scriptListBlobPath, err)
			return
		}
		var blob ScriptListBlob
		if err := gob.NewDecoder(bytes.NewReader(raw)).Decode(&blob); err != nil {
			scriptListErr = fmt.Errorf("decode %s: %w", scriptListBlobPath, err)
			return
		}

		jsonData := blob.ToJSON()
		scriptListData = ScriptListData{
			Scripts:             getOrderedNames(jsonData.Scripts),
			Langs:               getOrderedNames(jsonData.Langs),
			LangScriptMap:       jsonData.LangScriptMap,
			ScriptAlternatesMap: jsonData.ScriptAlternatesMap,
		}
	})
	return scriptListErr
}

func loadCustomOptionsMap() (map[string]CustomOption, error) {
	customOptionsOnce.Do(func() {
		raw, err := embedded.FS.ReadFile(customOptionsBlobPath)
		if err != nil {
			customOptionsErr = fmt.Errorf("read %s: %w", customOptionsBlobPath, err)
			return
		}
		var blob CustomOptionsBlob
		if err := gob.NewDecoder(bytes.NewReader(raw)).Decode(&blob); err != nil {
			customOptionsErr = fmt.Errorf("decode %s: %w", customOptionsBlobPath, err)
			return
		}
		customOptionsMap = blob.ToMap()
	})
	return customOptionsMap, customOptionsErr
}

func GetScriptData(name string) (ScriptData, error) {
	normalized, err := GetNormalizedScriptName(name)
	if err != nil {
		return ScriptData{}, err
	}

	all, err := loadScriptDataMap()
	if err != nil {
		return ScriptData{}, err
	}
	data, ok := all[normalized]
	if !ok {
		return ScriptData{}, fmt.Errorf("script %q not found after normalization", normalized)
	}
	return data, nil
}

func MustGetScriptData(name string) ScriptData {
	out, err := GetScriptData(name)
	if err != nil {
		panic(err)
	}
	return out
}

func GetScriptListData() (ScriptListData, error) {
	if err := loadScriptListJSON(); err != nil {
		return ScriptListData{}, err
	}
	return scriptListData, nil
}

func MustGetScriptListData() ScriptListData {
	out, err := GetScriptListData()
	if err != nil {
		panic(err)
	}
	return out
}

func GetCustomOptionsMap() (map[string]CustomOption, error) {
	return loadCustomOptionsMap()
}

func MustGetCustomOptionsMap() map[string]CustomOption {
	out, err := GetCustomOptionsMap()
	if err != nil {
		panic(err)
	}
	return out
}

func getOrderedNames(input map[string]uint8) []string {
	type nameRank struct {
		name string
		rank uint8
	}
	arr := make([]nameRank, 0, len(input))
	for name, rank := range input {
		arr = append(arr, nameRank{name: name, rank: rank})
	}
	slices.SortFunc(arr, func(a, b nameRank) int {
		if a.rank < b.rank {
			return -1
		}
		if a.rank > b.rank {
			return 1
		}
		return strings.Compare(a.name, b.name)
	})
	out := make([]string, 0, len(arr))
	for _, item := range arr {
		out = append(out, item.name)
	}
	return out
}
