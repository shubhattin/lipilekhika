use lipilekhika::transliterate;

fn main() {
    let _out =
        transliterate("libhi", "Normal", "Tamil-Extended", None).expect("Erro in transliration");
    let s = String::from("क्लेRust"); // Unicode!

    println!("{}", &s);
}
