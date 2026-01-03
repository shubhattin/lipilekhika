use crate::script_data::{
    ScriptData, get_custom_options_map, get_normalized_script_name, get_script_list_data,
};
use crate::utils::binary_search;

mod script_data;
mod transliterate;
mod utils;

macro_rules! is_tamil_ext {
    ($var:expr) => {
        $var == "Tamil-Extended"
    };
}

fn main() {
    let custom_option = get_custom_options_map();
    let data = ScriptData::get_script_data(&get_normalized_script_name("de").unwrap());
    let script_list_data = get_script_list_data();

    println!("{:?}", custom_option);
    println!("{:?}", data.krama_text_or_empty(3));
    println!("{:?}", script_list_data);
    println!("{}", is_tamil_ext!("Tamil"));
    let index =
        binary_search::binary_search_lower(&vec![1, 2, 4], &22, |a, i| a[i], |a, b| a.cmp(b));
    println!("{}", index.unwrap_or(111))
}
