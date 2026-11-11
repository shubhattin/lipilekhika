package transliterate

import "github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"

// GetAllOptions returns the custom option keys that have an effect from fromScript to toScript,
// in `custom_options.json` order (port of the rust `get_all_options`).
func GetAllOptions(fromScript, toScript string) ([]string, error) {
	fromNorm, err := scriptdata.GetNormalizedScriptName(fromScript)
	if err != nil {
		return nil, err
	}
	toNorm, err := scriptdata.GetNormalizedScriptName(toScript)
	if err != nil {
		return nil, err
	}
	// the text is returned as it is, no option has an effect (Hindi -> Sanskrit)
	if fromNorm == toNorm {
		return []string{}, nil
	}
	fromData, err := scriptdata.GetScriptData(fromNorm)
	if err != nil {
		return nil, err
	}
	toData, err := scriptdata.GetScriptData(toNorm)
	if err != nil {
		return nil, err
	}
	customOptionsMap, err := scriptdata.GetCustomOptionsMap()
	if err != nil {
		return nil, err
	}
	allEnabled := make(map[string]bool, len(customOptionsMap))
	for key := range customOptionsMap {
		allEnabled[key] = true
	}
	active := getActiveCustomOptions(fromData, toData, customOptionsMap, allEnabled)
	return orderedCustomOptionKeys(active), nil
}
