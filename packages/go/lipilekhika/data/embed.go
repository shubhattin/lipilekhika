package data

import "embed"

// FS contains generated binary artifacts committed to git.
//
//go:embed gob/*
var FS embed.FS
