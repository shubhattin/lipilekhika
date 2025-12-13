package lipilekhika

import "embed"

//go:embed data/custom_options.json data/script_data/*.json
var embeddedData embed.FS
