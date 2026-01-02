use crate::script_data::{ScriptData, get_custom_options_map};

pub mod script_data;

fn main() {
    let custom_option = get_custom_options_map();
    let data = ScriptData::get_script_data("Devanagari");

    println!("{:?}", custom_option);
    println!("{:?}", data);
}
