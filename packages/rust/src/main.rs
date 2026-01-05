use lipilekhika::transliterate;

fn main() {
  let _out = transliterate("ke", "Normal", "Devanagari", None).expect("Erro in transliration");
  _write(&_out).unwrap();

  // let s = String::from("क्लेRust"); // Unicode!
  // println!("{}", s);
}

fn _write(content: &str) -> std::io::Result<()> {
  use std::fs;
  fs::write("a.txt", content)?;
  Ok(())
}
