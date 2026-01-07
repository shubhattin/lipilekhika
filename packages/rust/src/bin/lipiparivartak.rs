use clap::Parser;
use lipilekhika::transliterate;

#[derive(Parser)]
#[command(name = "lipiparivartak")]
#[command(about = "A CLI tool for transliterating text between Indian scripts")]
struct Args {
  /// The text to transliterate
  #[arg(short = 't', long)]
  text: String,

  /// Source script name (e.g., Devanagari, Bengali, etc.)
  #[arg(short = 'f', long)]
  from: String,

  /// Target script name (e.g., Devanagari, Bengali, etc.)
  #[arg(short = 'o', long)]
  to: String,
}

fn main() {
  let args = Args::parse();

  match transliterate(&args.text, &args.from, &args.to, None) {
    Ok(result) => println!("{}", result),
    Err(error) => {
      eprintln!("Error: {}", error);
      std::process::exit(1);
    }
  }
}
