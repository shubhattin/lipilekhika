use crate::script_data::{ScriptData, get_custom_options_map, get_script_list_data};

pub mod script_data;

fn main() {
    let custom_option = get_custom_options_map();
    let data = ScriptData::get_script_data("Devanagari");
    let script_list_data = get_script_list_data();

    println!("{:?}", custom_option);
    println!("{:?}", data);
    println!("{:?}", script_list_data);
}
