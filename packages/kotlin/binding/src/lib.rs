//! JNI bindings of the lipilekhika crate for Kotlin: the native methods of `NativeLib` and
//! `TypingContext` (package `com.shubhattin.lipilekhika.core` of `packages/kotlin/lipilekhika`),
//! which wraps them in the public Kotlin API.
//!
//! Strings cross as UTF-16 (`GetStringRegion` / `NewString`), the encoding of a Java `String`:
//! no modified UTF-8, and a lone surrogate reads as U+FFFD. Errors are thrown as the Kotlin
//! `LipiException`s, a panic as an `IllegalStateException`.

use jni::JNIEnv;
use jni::objects::{JBooleanArray, JClass, JObject, JObjectArray, JString};
use jni::sys::{self, jboolean, jint, jobjectArray, jsize, jstring};
use lipilekhika::ScriptListEnum;
use lipilekhika::scripts::Script;
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::str::FromStr;

mod typing;

/// An error of a call: a Kotlin `LipiException`, or a JNI failure
pub(crate) enum Error {
    /// A script or language name that is not known (`LipiException.InvalidScript`)
    InvalidScript(String),
    /// A transliteration option key that is not known (`LipiException.UnknownOption`)
    UnknownOption(String),
    /// An argument outside its range (`LipiException.InvalidArgument`)
    InvalidArgument(String),
    /// A JNI call failed (a Java exception is pending, eg. an `OutOfMemoryError`)
    Jni(jni::errors::Error),
}

impl From<jni::errors::Error> for Error {
    fn from(e: jni::errors::Error) -> Self {
        Self::Jni(e)
    }
}

pub(crate) type Result<T> = std::result::Result<T, Error>;

const EXCEPTION_CLASS: &str = "com/shubhattin/lipilekhika/core/LipiException";

/// Runs the body of a native method: an error or a panic is thrown as a Java exception, and
/// `default` (ignored by Java) is returned.
pub(crate) fn run<'local, T>(
    env: &mut JNIEnv<'local>,
    default: T,
    body: impl FnOnce(&mut JNIEnv<'local>) -> Result<T>,
) -> T {
    let (class, msg) = match catch_unwind(AssertUnwindSafe(|| body(env))) {
        Ok(Ok(value)) => return value,
        Ok(Err(Error::InvalidScript(msg))) => (format!("{EXCEPTION_CLASS}$InvalidScript"), msg),
        Ok(Err(Error::UnknownOption(msg))) => (format!("{EXCEPTION_CLASS}$UnknownOption"), msg),
        Ok(Err(Error::InvalidArgument(msg))) => (format!("{EXCEPTION_CLASS}$InvalidArgument"), msg),
        Ok(Err(Error::Jni(e))) => {
            if env.exception_check().unwrap_or(true) {
                // the exception of the failed call is thrown
                return default;
            }
            (
                "java/lang/IllegalStateException".into(),
                format!("JNI error: {e}"),
            )
        }
        Err(panic) => {
            let msg = panic
                .downcast_ref::<&str>()
                .map(|s| s.to_string())
                .or_else(|| panic.downcast_ref::<String>().cloned())
                .unwrap_or_default();
            (
                "java/lang/IllegalStateException".into(),
                format!("lipilekhika panicked: {msg}"),
            )
        }
    };
    // when it fails, a Java exception (eg. NoClassDefFoundError) is pending anyway
    let _ = env.throw_new(class, msg);
    default
}

/// The text of a Java `String` (a lone surrogate reads as U+FFFD)
pub(crate) fn read_string(env: &JNIEnv, s: &JString) -> Result<String> {
    let raw = env.get_raw();
    let s = s.as_raw();
    if s.is_null() {
        return Err(Error::InvalidArgument("a string argument is null".into()));
    }
    // SAFETY: `s` is a non-null local reference to a `String` (the type of the Kotlin
    // parameter), and the region read is its whole length.
    unsafe {
        let len = ((**raw).GetStringLength.unwrap())(raw, s);
        let mut units: Vec<u16> = Vec::with_capacity(len as usize);
        ((**raw).GetStringRegion.unwrap())(raw, s, 0, len, units.as_mut_ptr());
        units.set_len(len as usize);
        Ok(String::from_utf16_lossy(&units))
    }
}

/// A new Java `String` of `text`
pub(crate) fn new_string(env: &JNIEnv, text: &str) -> Result<jstring> {
    let raw = env.get_raw();
    let units: Vec<u16> = text.encode_utf16().collect();
    // SAFETY: `units` holds `units.len()` UTF-16 units.
    let s = unsafe { ((**raw).NewString.unwrap())(raw, units.as_ptr(), units.len() as jsize) };
    if s.is_null() {
        // an OutOfMemoryError is pending
        return Err(Error::Jni(jni::errors::Error::JavaException));
    }
    Ok(s)
}

/// A new Java `String[]` of `items`
pub(crate) fn new_string_array<'local, S: AsRef<str>>(
    env: &mut JNIEnv<'local>,
    items: impl ExactSizeIterator<Item = S>,
) -> Result<JObjectArray<'local>> {
    let array = env.new_object_array(items.len() as jsize, "java/lang/String", JObject::null())?;
    for (i, item) in items.enumerate() {
        // SAFETY: a new local reference, deleted after it is stored in the array
        let s = unsafe { JObject::from_raw(new_string(env, item.as_ref())?) };
        env.set_object_array_element(&array, i as jsize, &s)?;
        env.delete_local_ref(s)?;
    }
    Ok(array)
}

/// A new Java array of `items` (arrays themselves), `class` naming their type (eg.
/// `[Ljava/lang/String;`)
pub(crate) fn new_nested_array<'local>(
    env: &mut JNIEnv<'local>,
    class: &str,
    items: Vec<JObjectArray<'local>>,
) -> Result<JObjectArray<'local>> {
    let array = env.new_object_array(items.len() as jsize, class, JObject::null())?;
    for (i, item) in items.into_iter().enumerate() {
        env.set_object_array_element(&array, i as jsize, &item)?;
        env.delete_local_ref(item)?;
    }
    Ok(array)
}

/// A script/language name, exactly as JS and Rust read it (no trimming of spaces)
pub(crate) fn parse_script(env: &JNIEnv, name: &JString, label: &str) -> Result<Script> {
    let name = read_string(env, name)?;
    Script::from_str(&name)
        .map_err(|e| Error::InvalidScript(format!("invalid {label} {name:?}: {e}")))
}

pub(crate) fn to_jboolean(value: bool) -> jboolean {
    if value { sys::JNI_TRUE } else { sys::JNI_FALSE }
}

/// `NativeLib.transliterate`: [text] from one script to another; `optionKeys` and
/// `optionValues` (both null for no options) are the custom options and their values.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_transliterate<'local>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
    text: JString<'local>,
    from_script: JString<'local>,
    to_script: JString<'local>,
    option_keys: JObjectArray<'local>,
    option_values: JBooleanArray<'local>,
) -> jstring {
    run(&mut env, std::ptr::null_mut(), |env| {
        let options = if option_keys.is_null() {
            None
        } else {
            let len = env.get_array_length(&option_keys)?;
            let mut values = vec![sys::JNI_FALSE; len as usize];
            env.get_boolean_array_region(&option_values, 0, &mut values)?;
            let mut options = lipilekhika::CustomOptions::default();
            for (i, value) in values.into_iter().enumerate() {
                let key = JString::from(env.get_object_array_element(&option_keys, i as jsize)?);
                let key_text = read_string(env, &key)?;
                env.delete_local_ref(key)?;
                options
                    .try_set(&key_text, value != sys::JNI_FALSE)
                    .map_err(|_| {
                        Error::UnknownOption(format!("unknown transliteration option {key_text:?}"))
                    })?;
            }
            Some(options)
        };
        let from = parse_script(env, &from_script, "from_script")?;
        let to = parse_script(env, &to_script, "to_script")?;
        if ScriptListEnum::from(from) == ScriptListEnum::from(to) {
            // a same-script pair gives the text as it is
            return Ok(text.into_raw());
        }
        let text = read_string(env, &text)?;
        new_string(
            env,
            &lipilekhika::transliterate(&text, from, to, options.as_ref()),
        )
    })
}

/// `NativeLib.preloadScriptData`: loads the data of a script ahead of its first use.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_preloadScriptData<'local>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
    script_name: JString<'local>,
) {
    run(&mut env, (), |env| {
        lipilekhika::preload_script_data(parse_script(env, &script_name, "script_name")?);
        Ok(())
    })
}

/// `NativeLib.getSchwaStatusForScript`: the schwa deletion property of a Brahmic script, `1`
/// (true), `0` (false), `-1` for the other scripts.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_getSchwaStatusForScript<
    'local,
>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
    script_name: JString<'local>,
) -> jint {
    run(&mut env, -1, |env| {
        let script = parse_script(env, &script_name, "script_name")?;
        Ok(match lipilekhika::get_schwa_status_for_script(script) {
            Some(status) => status as jint,
            None => -1,
        })
    })
}

/// `NativeLib.getAllOptions`: the transliteration option keys from one script to another.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_getAllOptions<'local>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
    from_script: JString<'local>,
    to_script: JString<'local>,
) -> jobjectArray {
    run(&mut env, std::ptr::null_mut(), |env| {
        let from = parse_script(env, &from_script, "from_script")?;
        let to = parse_script(env, &to_script, "to_script")?;
        let options = lipilekhika::get_all_options(from, to);
        Ok(new_string_array(env, options.iter())?.into_raw())
    })
}

/// `NativeLib.getNormalizedScriptName`: the script name of a script, language or alias name.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_getNormalizedScriptName<
    'local,
>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
    script_name: JString<'local>,
) -> jstring {
    run(&mut env, std::ptr::null_mut(), |env| {
        let script = parse_script(env, &script_name, "script_name")?;
        new_string(env, ScriptListEnum::from(script).as_ref())
    })
}

/// `NativeLib.getScriptListData`: `[scripts, langs, langScriptMap, scriptAlternatesMap]`, the
/// maps as `[key, value, key, value, ...]` (in the order of the data).
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_getScriptListData<'local>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
) -> jobjectArray {
    run(&mut env, std::ptr::null_mut(), |env| {
        let data = lipilekhika::get_script_list_data();
        let flat = |map: &[(&String, &String)]| -> Vec<String> {
            map.iter()
                .flat_map(|(k, v)| [(*k).clone(), (*v).clone()])
                .collect()
        };
        let lang_script: Vec<_> = data.lang_script_map.iter().collect();
        let alternates: Vec<_> = data.script_alternates_map.iter().collect();
        let lists = vec![
            new_string_array(env, data.scripts.iter())?,
            new_string_array(env, data.langs.iter())?,
            new_string_array(env, flat(&lang_script).iter())?,
            new_string_array(env, flat(&alternates).iter())?,
        ];
        Ok(new_nested_array(env, "[Ljava/lang/String;", lists)?.into_raw())
    })
}
