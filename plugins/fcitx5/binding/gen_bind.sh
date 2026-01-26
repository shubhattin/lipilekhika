#!/bin/bash  
set -e  

cbindgen --config cbindgen.toml --crate lipilekhika-fcitx5-binding --output include/lipilekhika_typing.h