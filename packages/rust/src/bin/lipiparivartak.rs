use std::env;
use std::process;

use lipilekhika::transliterate;

fn usage_and_exit(exit_code: i32) -> ! {
  eprintln!(
    "lipiparivartak — transliterate text between Indian scripts

USAGE:
    lipiparivartak -t <TEXT> -f <FROM> -o <TO>

OPTIONS:
    -t, --text <TEXT>     The text to transliterate (required)
    -f, --from <SCRIPT>   Source script name (e.g., Devanagari) (required)
    -o, --to <SCRIPT>     Target script name (e.g., Bengali) (required)
    -h, --help            Print this help message

EXAMPLE:
    lipiparivartak -t \"नमस्ते\" -f Devanagari -o Bengali
"
  );
  process::exit(exit_code);
}

fn parse_args() -> Result<(String, String, String), String> {
  // collect args skipping program name
  let args: Vec<String> = env::args().skip(1).collect();
  if args.is_empty() {
    return Err("no arguments provided".into());
  }

  let mut text: Option<String> = None;
  let mut from: Option<String> = None;
  let mut to: Option<String> = None;

  let mut i = 0usize;
  while i < args.len() {
    let a = &args[i];

    if a == "-h" || a == "--help" {
      usage_and_exit(0);
    } else if a.starts_with("--") {
      // long form: --key or --key=value
      if let Some(eq) = a.find('=') {
        let key = &a[2..eq];
        let val = &a[(eq + 1)..];
        match key {
          "text" => text = Some(val.to_string()),
          "from" => from = Some(val.to_string()),
          "to" => to = Some(val.to_string()),
          k => return Err(format!("unknown option: --{}", k)),
        }
      } else {
        let key = &a[2..];
        // expect next arg to be value
        i += 1;
        if i >= args.len() {
          return Err(format!("option --{} requires a value", key));
        }
        let val = args[i].clone();
        match key {
          "text" => text = Some(val),
          "from" => from = Some(val),
          "to" => to = Some(val),
          k => return Err(format!("unknown option: --{}", k)),
        }
      }
    } else if a.starts_with('-') {
      // short form: -tVALUE or -t VALUE
      let chars: Vec<char> = a.chars().collect();
      // handle e.g. -tvalue or -t value
      if chars.len() >= 2 {
        let flag = chars[1];
        let rest = &a[2..];
        let value: String;
        if !rest.is_empty() {
          // combined like -tvalue
          value = rest.to_string();
        } else {
          // value is next arg
          i += 1;
          if i >= args.len() {
            return Err(format!("option -{} requires a value", flag));
          }
          value = args[i].clone();
        }
        match flag {
          't' => text = Some(value),
          'f' => from = Some(value),
          'o' => to = Some(value),
          h if h == 'h' => {
            usage_and_exit(0);
          }
          other => return Err(format!("unknown short option: -{}", other)),
        }
      } else {
        return Err(format!("invalid option: {}", a));
      }
    } else {
      // positional/extra argument — we treat as error for now
      return Err(format!("unexpected argument: {}", a));
    }

    i += 1;
  }

  // check required options
  match (text, from, to) {
    (Some(t), Some(f), Some(o)) => Ok((t, f, o)),
    (None, _, _) => Err("missing required option --text / -t".into()),
    (_, None, _) => Err("missing required option --from / -f".into()),
    (_, _, None) => Err("missing required option --to / -o".into()),
  }
}

fn main() {
  let (text, from, to) = match parse_args() {
    Ok(vals) => vals,
    Err(err) => {
      eprintln!("Error: {}", err);
      usage_and_exit(2);
    }
  };

  match transliterate(&text, &from, &to, None) {
    Ok(result) => {
      println!("{}", result);
    }
    Err(e) => {
      eprintln!("Transliteration error: {}", e);
      process::exit(1);
    }
  }
}
