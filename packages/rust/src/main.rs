use lipilekhika::transliterate;

fn main() {
    println!("Hello");
    let out =
        transliterate("libhi", "Normal", "Tamil-Extended", None).expect("Erro in transliration");
    println!("{}", out);
}
