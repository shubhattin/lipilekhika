use crate::script_data::custom_options;

pub mod script_data;

fn main() {
    let data = custom_options::get_custom_options_map();

    // println!("{:?}", data)   ;
    println!("{:?}", data)
}
