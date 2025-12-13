package lipilekhika

import "lipilekhika/scriptdata"

type prevContextItem struct {
	Text string
	Item *scriptdata.ListItem
}

type prevContext struct {
	max int
	arr []prevContextItem
}

func newPrevContext(maxLen int) *prevContext {
	return &prevContext{max: maxLen, arr: []prevContextItem{}}
}

func (p *prevContext) Clear() {
	p.arr = p.arr[:0]
}

func (p *prevContext) Len() int {
	return len(p.arr)
}

func (p *prevContext) At(i int) *prevContextItem {
	if len(p.arr) == 0 {
		return nil
	}
	if i < 0 {
		i = len(p.arr) + i
	}
	if i < 0 || i >= len(p.arr) {
		return nil
	}
	return &p.arr[i]
}

func (p *prevContext) TypeAt(i int) string {
	it := p.At(i)
	if it == nil || it.Item == nil {
		return ""
	}
	return it.Item.Type
}

func (p *prevContext) TextAt(i int) string {
	it := p.At(i)
	if it == nil {
		return ""
	}
	return it.Text
}

func (p *prevContext) Push(text string, item *scriptdata.ListItem) {
	if text != "" {
		p.arr = append(p.arr, prevContextItem{Text: text, Item: item})
		if len(p.arr) > p.max {
			p.arr = p.arr[1:]
		}
	}
}
