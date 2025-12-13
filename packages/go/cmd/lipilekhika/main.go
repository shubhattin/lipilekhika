package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"lipilekhika"
)

func main() {
	var from string
	var to string
	var input string

	flag.StringVar(&from, "from", "", "source script/language (e.g. Devanagari, dev, Sanskrit)")
	flag.StringVar(&to, "to", "", "target script/language (e.g. Normal, Tamil, Telugu)")
	flag.StringVar(&input, "input", "", "input text (if empty, reads from stdin)")
	flag.Parse()

	if strings.TrimSpace(from) == "" || strings.TrimSpace(to) == "" {
		fmt.Fprintln(os.Stderr, "error: --from and --to are required")
		flag.Usage()
		os.Exit(2)
	}

	if input == "" {
		b, err := io.ReadAll(os.Stdin)
		if err != nil {
			fmt.Fprintln(os.Stderr, "error reading stdin:", err)
			os.Exit(1)
		}
		input = string(b)
	}

	out, err := lipilekhika.Transliterate(input, from, to, nil)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
	fmt.Print(out)
}


