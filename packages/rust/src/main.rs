use lipilekhika::transliterate;

fn main() {
    let _out =
        transliterate("libhi", "Normal", "Tamil-Extended", None).expect("Erro in transliration");
    let mut s = String::from("123456"); // Unicode!

    s.pop();
    println!("{:?}", s);
}
