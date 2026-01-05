use lipilekhika::transliterate;

fn main() {
  let _out = transliterate("libhi", "Normal", "Devanagari", None).expect("Erro in transliration");
  let s = String::from("क्लेRust"); // Unicode!
  _write(&_out).unwrap();

  println!("{}", s);
}

fn _write(content: &str) -> std::io::Result<()> {
  use std::fs;
  fs::write("a.txt", content)?;
  Ok(())
}
