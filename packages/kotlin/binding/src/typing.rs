//! The typing natives: the defaults, the typing context (`TypingContext` of Kotlin holds the
//! pointer to it as a `Long` and calls these methods under its lock) and the typing data.

use crate::{
    Error, Result, new_nested_array, new_string, new_string_array, parse_script, read_string, run,
    to_jboolean,
};
use jni::JNIEnv;
use jni::objects::{JClass, JIntArray, JObject, JObjectArray, JString};
use jni::sys::{jboolean, jint, jlong, jobjectArray, jstring};
use lipilekhika::typing as lt;

#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_defaultAutoContextClearTimeMs(
    _: JNIEnv,
    _: JClass,
) -> jlong {
    lt::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS as jlong
}

#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_defaultUseNativeNumerals(
    _: JNIEnv,
    _: JClass,
) -> jboolean {
    to_jboolean(lt::DEFAULT_USE_NATIVE_NUMERALS)
}

#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_defaultIncludeInherentVowel(
    _: JNIEnv,
    _: JClass,
) -> jboolean {
    to_jboolean(lt::DEFAULT_INCLUDE_INHERENT_VOWEL)
}

/// `NativeLib.typingContextNew`: a new typing context (the options apply when `hasOptions`),
/// the pointer to it. Freed by `typingContextFree`.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_typingContextNew<'local>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
    typing_script: JString<'local>,
    has_options: jboolean,
    auto_context_clear_time_ms: jlong,
    use_native_numerals: jboolean,
    include_inherent_vowel: jboolean,
) -> jlong {
    run(&mut env, 0, |env| {
        let script = parse_script(env, &typing_script, "typing_script")?;
        let options = if has_options != 0 {
            let ms = u64::try_from(auto_context_clear_time_ms).map_err(|_| {
                Error::InvalidArgument(format!(
                    "autoContextClearTimeMs must be 0 or more milliseconds, got \
                     {auto_context_clear_time_ms}"
                ))
            })?;
            Some(lt::TypingContextOptions {
                auto_context_clear_time_ms: ms,
                use_native_numerals: use_native_numerals != 0,
                include_inherent_vowel: include_inherent_vowel != 0,
            })
        } else {
            None
        };
        let ctx = Box::new(lt::TypingContext::new(script, options));
        Ok(Box::into_raw(ctx) as jlong)
    })
}

/// `NativeLib.typingContextFree`: frees a typing context (once, the Kotlin side makes sure).
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_typingContextFree(
    _: JNIEnv,
    _: JClass,
    handle: jlong,
) {
    if handle != 0 {
        // SAFETY: a pointer of `typingContextNew`, not freed before (the Kotlin side frees it
        // once and does not use it after)
        drop(unsafe { Box::from_raw(handle as *mut lt::TypingContext) });
    }
}

/// The typing context of a handle.
///
/// SAFETY: `handle` is a live pointer of `typingContextNew`, used by one thread at a time (the
/// methods of the Kotlin `TypingContext` are synchronized and check it is not closed).
unsafe fn ctx<'a>(handle: jlong) -> &'a mut lt::TypingContext {
    unsafe { &mut *(handle as *mut lt::TypingContext) }
}

/// The natives of the Kotlin `TypingContext` are its private instance methods: the object (the
/// `this` argument) stays reachable during the call, so it is not freed by the cleaner.
macro_rules! ctx_native {
    ($name:ident ( $($arg:ident : $ty:ty),* ) -> $ret:ty, $default:expr, |$env:ident, $ctx:ident| $body:expr) => {
        #[unsafe(no_mangle)]
        pub extern "system" fn $name<'local>(
            mut env: JNIEnv<'local>,
            _this: JObject<'local>,
            handle: jlong,
            $($arg: $ty),*
        ) -> $ret {
            run(&mut env, $default, |$env| {
                // SAFETY: see `ctx`
                let $ctx = unsafe { ctx(handle) };
                $body
            })
        }
    };
}

ctx_native!(Java_com_shubhattin_lipilekhika_core_TypingContext_nativeClearContext() -> (), (),
|_env, ctx| {
    ctx.clear_context();
    Ok(())
});

// `out` gets `[toDeleteCharsCount, contextLength]`, the added text is returned.
ctx_native!(Java_com_shubhattin_lipilekhika_core_TypingContext_nativeTakeKeyInput(
    key: JString<'local>, out: JIntArray<'local>) -> jstring, std::ptr::null_mut(),
|env, ctx| {
    let key = read_string(env, &key)?;
    let diff = ctx.take_key_input(&key);
    let counts = [
        jint::try_from(diff.to_delete_chars_count).unwrap_or(jint::MAX),
        jint::try_from(diff.context_length).unwrap_or(jint::MAX),
    ];
    env.set_int_array_region(&out, 0, &counts)?;
    new_string(env, &diff.diff_add_text)
});

ctx_native!(Java_com_shubhattin_lipilekhika_core_TypingContext_nativeUpdateUseNativeNumerals(
    value: jboolean) -> (), (),
|_env, ctx| {
    ctx.update_use_native_numerals(value != 0);
    Ok(())
});

ctx_native!(Java_com_shubhattin_lipilekhika_core_TypingContext_nativeUpdateIncludeInherentVowel(
    value: jboolean) -> (), (),
|_env, ctx| {
    ctx.update_include_inherent_vowel(value != 0);
    Ok(())
});

ctx_native!(Java_com_shubhattin_lipilekhika_core_TypingContext_nativeGetUseNativeNumerals()
        -> jboolean, 0,
    |_env, ctx| Ok(to_jboolean(ctx.get_use_native_numerals())));

ctx_native!(Java_com_shubhattin_lipilekhika_core_TypingContext_nativeGetIncludeInherentVowel()
        -> jboolean, 0,
    |_env, ctx| Ok(to_jboolean(ctx.get_include_inherent_vowel())));

ctx_native!(Java_com_shubhattin_lipilekhika_core_TypingContext_nativeGetNormalizedScript()
        -> jstring, std::ptr::null_mut(),
    |env, ctx| new_string(env, ctx.get_normalized_script()));

/// The ordinal of the Kotlin `ListType` (as text in the item arrays)
fn list_type_ordinal(list_type: &lt::ListType) -> &'static str {
    match list_type {
        lt::ListType::Anya => "0",
        lt::ListType::Vyanjana => "1",
        lt::ListType::Matra => "2",
        lt::ListType::Svara => "3",
    }
}

/// `[text, ListType ordinal, mapping, mapping, ...]` for each item
fn typing_items<'local>(
    env: &mut JNIEnv<'local>,
    list: &[lt::TypingDataMapItem],
) -> Result<JObjectArray<'local>> {
    let mut items = Vec::with_capacity(list.len());
    for (text, list_type, mappings) in list {
        let fields = [text.as_str(), list_type_ordinal(list_type)]
            .into_iter()
            .chain(mappings.iter().map(String::as_str))
            .collect::<Vec<_>>();
        items.push(new_string_array(env, fields.into_iter())?);
    }
    new_nested_array(env, "[Ljava/lang/String;", items)
}

/// `NativeLib.getScriptTypingDataMap`: `[commonKramaMap, scriptSpecificKramaMap]`, each a list
/// of `[text, ListType ordinal, mappings...]`.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_getScriptTypingDataMap<
    'local,
>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
    script: JString<'local>,
) -> jobjectArray {
    run(&mut env, std::ptr::null_mut(), |env| {
        let script = parse_script(env, &script, "script")?;
        let data = lt::get_script_typing_data_map(script);
        let maps = vec![
            typing_items(env, &data.common_krama_map)?,
            typing_items(env, &data.script_specific_krama_map)?,
        ];
        Ok(new_nested_array(env, "[[Ljava/lang/String;", maps)?.into_raw())
    })
}

/// `NativeLib.getScriptKramaData`: the krama list of a script, `[text, ListType ordinal]` for
/// each item.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_shubhattin_lipilekhika_core_NativeLib_getScriptKramaData<'local>(
    mut env: JNIEnv<'local>,
    _: JClass<'local>,
    script: JString<'local>,
) -> jobjectArray {
    run(&mut env, std::ptr::null_mut(), |env| {
        let script = parse_script(env, &script, "script")?;
        let list = lt::get_script_krama_data(script);
        let mut items = Vec::with_capacity(list.len());
        for (text, list_type) in &list {
            items.push(new_string_array(
                env,
                [text.as_str(), list_type_ordinal(list_type)].into_iter(),
            )?);
        }
        Ok(new_nested_array(env, "[Ljava/lang/String;", items)?.into_raw())
    })
}
