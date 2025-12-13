package lipilekhika

import "lipilekhika/scriptdata"

func binarySearchLowerTextToKrama(arr []scriptdata.TextToKramaEntry, target string) int {
	left, right := 0, len(arr)-1
	result := -1
	for left <= right {
		mid := (left + right) / 2
		value := arr[mid].Text
		var cmp int
		if target < value {
			cmp = -1
		} else if target > value {
			cmp = 1
		} else {
			cmp = 0
		}
		if cmp == 0 {
			result = mid
			right = mid - 1
		} else if cmp < 0 {
			right = mid - 1
		} else {
			left = mid + 1
		}
	}
	return result
}

func binarySearchLowerWithIndexKramaText(
	arr []scriptdata.KramaTextEntry,
	index []int,
	target string,
) int {
	left, right := 0, len(index)-1
	result := -1
	for left <= right {
		mid := (left + right) / 2
		orig := index[mid]
		value := arr[orig].Key
		var cmp int
		if target < value {
			cmp = -1
		} else if target > value {
			cmp = 1
		} else {
			cmp = 0
		}
		if cmp == 0 {
			result = orig
			right = mid - 1
		} else if cmp < 0 {
			right = mid - 1
		} else {
			left = mid + 1
		}
	}
	return result
}
