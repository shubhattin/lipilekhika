//! CLI transliteration helper (dev / local use). `clap` is a dev-dependency.
//!
//! Run: `cargo run --example parivartak --release -p lipilekhika -- --help`

use clap::Parser;
use lipilekhika::scripts::Script;
use lipilekhika::transliterate;
use std::str::FromStr;

#[derive(Parser)]
#[command(name = "parivartak")]
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

    let from = Script::from_str(&args.from).unwrap_or_else(|e| {
        eprintln!("Error: invalid --from {:?}: {}", args.from, e);
        std::process::exit(1);
    });
    let to = Script::from_str(&args.to).unwrap_or_else(|e| {
        eprintln!("Error: invalid --to {:?}: {}", args.to, e);
        std::process::exit(1);
    });

    let result = transliterate(&args.text, from, to, None);
    println!("{}", result);
}
