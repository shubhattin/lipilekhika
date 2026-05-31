#[rustfmt::skip]
use strum::{AsRefStr, Display, EnumString};
/// The list of all supported scripts (internal resolved type)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, AsRefStr, Display, EnumString)]
#[strum(ascii_case_insensitive)]
pub enum ScriptListEnum {
    #[strum(serialize = "Devanagari")]
    Devanagari,
    #[strum(serialize = "Telugu")]
    Telugu,
    #[strum(serialize = "Tamil")]
    Tamil,
    #[strum(serialize = "Tamil-Extended")]
    TamilExtended,
    #[strum(serialize = "Bengali")]
    Bengali,
    #[strum(serialize = "Kannada")]
    Kannada,
    #[strum(serialize = "Gujarati")]
    Gujarati,
    #[strum(serialize = "Malayalam")]
    Malayalam,
    #[strum(serialize = "Odia")]
    Odia,
    #[strum(serialize = "Sinhala")]
    Sinhala,
    #[strum(serialize = "Normal")]
    Normal,
    #[strum(serialize = "Romanized")]
    Romanized,
    #[strum(serialize = "Gurumukhi")]
    Gurumukhi,
    #[strum(serialize = "Assamese")]
    Assamese,
    #[strum(serialize = "Purna-Devanagari")]
    PurnaDevanagari,
    #[strum(serialize = "Brahmi")]
    Brahmi,
    #[strum(serialize = "Granth")]
    Granth,
    #[strum(serialize = "Modi")]
    Modi,
    #[strum(serialize = "Sharada")]
    Sharada,
    #[strum(serialize = "Siddham")]
    Siddham,
}
impl ScriptListEnum {
    /// Resolves a canonical `script_list.json` script id to the internal script enum.
    #[inline]
    pub const fn from_id(id: u8) -> Option<Self> {
        match id {
            1u8 => Some(Self::Devanagari),
            2u8 => Some(Self::Telugu),
            3u8 => Some(Self::Tamil),
            4u8 => Some(Self::TamilExtended),
            5u8 => Some(Self::Bengali),
            6u8 => Some(Self::Kannada),
            7u8 => Some(Self::Gujarati),
            8u8 => Some(Self::Malayalam),
            9u8 => Some(Self::Odia),
            10u8 => Some(Self::Sinhala),
            11u8 => Some(Self::Normal),
            12u8 => Some(Self::Romanized),
            13u8 => Some(Self::Gurumukhi),
            14u8 => Some(Self::Assamese),
            15u8 => Some(Self::PurnaDevanagari),
            16u8 => Some(Self::Brahmi),
            17u8 => Some(Self::Granth),
            18u8 => Some(Self::Modi),
            20u8 => Some(Self::Sharada),
            21u8 => Some(Self::Siddham),
            _ => None,
        }
    }
}
/// List of all supported scripts, languages and their aliases
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, AsRefStr, Display, EnumString)]
#[strum(ascii_case_insensitive)]
pub enum Script {
    #[strum(serialize = "Devanagari")]
    Devanagari,
    #[strum(serialize = "Telugu")]
    Telugu,
    #[strum(serialize = "Tamil")]
    Tamil,
    #[strum(serialize = "Tamil-Extended")]
    TamilExtended,
    #[strum(serialize = "Bengali")]
    Bengali,
    #[strum(serialize = "Kannada")]
    Kannada,
    #[strum(serialize = "Gujarati")]
    Gujarati,
    #[strum(serialize = "Malayalam")]
    Malayalam,
    #[strum(serialize = "Odia")]
    Odia,
    #[strum(serialize = "Sinhala")]
    Sinhala,
    #[strum(serialize = "Normal")]
    Normal,
    #[strum(serialize = "Romanized")]
    Romanized,
    #[strum(serialize = "Gurumukhi")]
    Gurumukhi,
    #[strum(serialize = "Assamese")]
    Assamese,
    #[strum(serialize = "Purna-Devanagari")]
    PurnaDevanagari,
    #[strum(serialize = "Brahmi")]
    Brahmi,
    #[strum(serialize = "Granth")]
    Granth,
    #[strum(serialize = "Modi")]
    Modi,
    #[strum(serialize = "Sharada")]
    Sharada,
    #[strum(serialize = "Siddham")]
    Siddham,
    #[strum(serialize = "English")]
    English,
    #[strum(serialize = "Sanskrit")]
    Sanskrit,
    #[strum(serialize = "Hindi")]
    Hindi,
    #[strum(serialize = "Marathi")]
    Marathi,
    #[strum(serialize = "Nepali")]
    Nepali,
    #[strum(serialize = "Punjabi")]
    Punjabi,
    #[strum(serialize = "de")]
    De,
    #[strum(serialize = "dev")]
    Dev,
    #[strum(serialize = "te")]
    Te,
    #[strum(serialize = "tel")]
    Tel,
    #[strum(serialize = "tam")]
    Tam,
    #[strum(serialize = "tam-ext")]
    TamExt,
    #[strum(serialize = "ta-ext")]
    TaExt,
    #[strum(serialize = "ben")]
    Ben,
    #[strum(serialize = "be")]
    Be,
    #[strum(serialize = "ka")]
    Ka,
    #[strum(serialize = "kan")]
    Kan,
    #[strum(serialize = "gu")]
    Gu,
    #[strum(serialize = "guj")]
    Guj,
    #[strum(serialize = "mal")]
    Mal,
    #[strum(serialize = "or")]
    Or,
    #[strum(serialize = "od")]
    Od,
    #[strum(serialize = "oriya")]
    Oriya,
    #[strum(serialize = "si")]
    Si,
    #[strum(serialize = "sinh")]
    Sinh,
    #[strum(serialize = "sin")]
    Sin,
    #[strum(serialize = "en")]
    En,
    #[strum(serialize = "eng")]
    Eng,
    #[strum(serialize = "la")]
    La,
    #[strum(serialize = "lat")]
    Lat,
    #[strum(serialize = "nor")]
    Nor,
    #[strum(serialize = "norm")]
    Norm,
    #[strum(serialize = "rom")]
    Rom,
    #[strum(serialize = "gur")]
    Gur,
    #[strum(serialize = "as")]
    As_,
    #[strum(serialize = "sa")]
    Sa,
    #[strum(serialize = "san")]
    San,
    #[strum(serialize = "hin")]
    Hin,
    #[strum(serialize = "hi")]
    Hi,
    #[strum(serialize = "mar")]
    Mar,
    #[strum(serialize = "ne")]
    Ne,
    #[strum(serialize = "nep")]
    Nep,
    #[strum(serialize = "pun")]
    Pun,
}
impl Script {
    /// Resolves a canonical `script_list.json` script id to the canonical script variant.
    #[inline]
    pub const fn from_id(id: u8) -> Option<Self> {
        match id {
            1u8 => Some(Self::Devanagari),
            2u8 => Some(Self::Telugu),
            3u8 => Some(Self::Tamil),
            4u8 => Some(Self::TamilExtended),
            5u8 => Some(Self::Bengali),
            6u8 => Some(Self::Kannada),
            7u8 => Some(Self::Gujarati),
            8u8 => Some(Self::Malayalam),
            9u8 => Some(Self::Odia),
            10u8 => Some(Self::Sinhala),
            11u8 => Some(Self::Normal),
            12u8 => Some(Self::Romanized),
            13u8 => Some(Self::Gurumukhi),
            14u8 => Some(Self::Assamese),
            15u8 => Some(Self::PurnaDevanagari),
            16u8 => Some(Self::Brahmi),
            17u8 => Some(Self::Granth),
            18u8 => Some(Self::Modi),
            20u8 => Some(Self::Sharada),
            21u8 => Some(Self::Siddham),
            _ => None,
        }
    }
}
impl From<Script> for ScriptListEnum {
    fn from(lang: Script) -> Self {
        match lang {
            Script::Devanagari => ScriptListEnum::Devanagari,
            Script::Telugu => ScriptListEnum::Telugu,
            Script::Tamil => ScriptListEnum::Tamil,
            Script::TamilExtended => ScriptListEnum::TamilExtended,
            Script::Bengali => ScriptListEnum::Bengali,
            Script::Kannada => ScriptListEnum::Kannada,
            Script::Gujarati => ScriptListEnum::Gujarati,
            Script::Malayalam => ScriptListEnum::Malayalam,
            Script::Odia => ScriptListEnum::Odia,
            Script::Sinhala => ScriptListEnum::Sinhala,
            Script::Normal => ScriptListEnum::Normal,
            Script::Romanized => ScriptListEnum::Romanized,
            Script::Gurumukhi => ScriptListEnum::Gurumukhi,
            Script::Assamese => ScriptListEnum::Assamese,
            Script::PurnaDevanagari => ScriptListEnum::PurnaDevanagari,
            Script::Brahmi => ScriptListEnum::Brahmi,
            Script::Granth => ScriptListEnum::Granth,
            Script::Modi => ScriptListEnum::Modi,
            Script::Sharada => ScriptListEnum::Sharada,
            Script::Siddham => ScriptListEnum::Siddham,
            Script::English => ScriptListEnum::Normal,
            Script::Sanskrit => ScriptListEnum::Devanagari,
            Script::Hindi => ScriptListEnum::Devanagari,
            Script::Marathi => ScriptListEnum::Devanagari,
            Script::Nepali => ScriptListEnum::Devanagari,
            Script::Punjabi => ScriptListEnum::Gurumukhi,
            Script::De => ScriptListEnum::Devanagari,
            Script::Dev => ScriptListEnum::Devanagari,
            Script::Te => ScriptListEnum::Telugu,
            Script::Tel => ScriptListEnum::Telugu,
            Script::Tam => ScriptListEnum::Tamil,
            Script::TamExt => ScriptListEnum::TamilExtended,
            Script::TaExt => ScriptListEnum::TamilExtended,
            Script::Ben => ScriptListEnum::Bengali,
            Script::Be => ScriptListEnum::Bengali,
            Script::Ka => ScriptListEnum::Kannada,
            Script::Kan => ScriptListEnum::Kannada,
            Script::Gu => ScriptListEnum::Gujarati,
            Script::Guj => ScriptListEnum::Gujarati,
            Script::Mal => ScriptListEnum::Malayalam,
            Script::Or => ScriptListEnum::Odia,
            Script::Od => ScriptListEnum::Odia,
            Script::Oriya => ScriptListEnum::Odia,
            Script::Si => ScriptListEnum::Sinhala,
            Script::Sinh => ScriptListEnum::Sinhala,
            Script::Sin => ScriptListEnum::Sinhala,
            Script::En => ScriptListEnum::Normal,
            Script::Eng => ScriptListEnum::Normal,
            Script::La => ScriptListEnum::Normal,
            Script::Lat => ScriptListEnum::Normal,
            Script::Nor => ScriptListEnum::Normal,
            Script::Norm => ScriptListEnum::Normal,
            Script::Rom => ScriptListEnum::Romanized,
            Script::Gur => ScriptListEnum::Gurumukhi,
            Script::As_ => ScriptListEnum::Assamese,
            Script::Sa => ScriptListEnum::Devanagari,
            Script::San => ScriptListEnum::Devanagari,
            Script::Hin => ScriptListEnum::Devanagari,
            Script::Hi => ScriptListEnum::Devanagari,
            Script::Mar => ScriptListEnum::Devanagari,
            Script::Ne => ScriptListEnum::Devanagari,
            Script::Nep => ScriptListEnum::Devanagari,
            Script::Pun => ScriptListEnum::Gurumukhi,
        }
    }
}
