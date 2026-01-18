package main

/*
#cgo LDFLAGS: -L. -lrustlipi
#include <stdint.h>
#include <stdlib.h>

typedef struct {
	char* result;
	char* error;
} TransliterateResult;

int32_t add(int32_t a, int32_t b);
TransliterateResult lipi_transliterate(const char* text, const char* from, const char* to, const char* options_json);
void free_transliterate_result(TransliterateResult res);
*/
import "C"

import (
	"fmt"
	"unsafe"
)

func main() {
	// Test the simple add function first
	result := C.add(2, 3)
	fmt.Println("Result from Rust add:", result)

	// Test transliteration without options (pass nil)
	text := C.CString("namastE")
	from := C.CString("Normal")
	to := C.CString("Devanagari")
	defer C.free(unsafe.Pointer(text))
	defer C.free(unsafe.Pointer(from))
	defer C.free(unsafe.Pointer(to))

	// Pass nil for no options
	transResult := C.lipi_transliterate(text, from, to, nil)
	defer C.free_transliterate_result(transResult)

	if transResult.error != nil {
		errMsg := C.GoString(transResult.error)
		fmt.Println("Error:", errMsg)
	} else {
		transliterated := C.GoString(transResult.result)
		fmt.Println("Transliterated (no options):", transliterated)
	}

	// Test transliteration with options (JSON string)
	text2 := C.CString("गङ्गा")
	from2 := C.CString("dev")
	to2 := C.CString("nor")
	optionsJson := C.CString(`{"all_to_normal:replace_pancham_varga_varna_with_n": true}`)
	defer C.free(unsafe.Pointer(text2))
	defer C.free(unsafe.Pointer(from2))
	defer C.free(unsafe.Pointer(to2))
	defer C.free(unsafe.Pointer(optionsJson))

	transResult2 := C.lipi_transliterate(text2, from2, to2, optionsJson)
	defer C.free_transliterate_result(transResult2)

	if transResult2.error != nil {
		errMsg := C.GoString(transResult2.error)
		fmt.Println("Error (with options):", errMsg)
	} else {
		transliterated := C.GoString(transResult2.result)
		fmt.Println("Transliterated (with options):", transliterated)
	}
}
