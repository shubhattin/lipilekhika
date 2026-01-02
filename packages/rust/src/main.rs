use crate::script_data::ScriptData;

pub mod script_data;

fn main() {
    let data = ScriptData::get_script_data("Devanagari");

    // println!("{:?}", data)   ;
    println!("{:?}", data.get_common_attr())
}
