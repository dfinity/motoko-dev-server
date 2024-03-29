use motoko::{
    ast::ToId,
    vm_types::{Core, Limits},
    Interruption, ToMotoko, Value,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use std::cell::RefCell;
use wasm_bindgen::prelude::*;

type Result<T = JsValue, E = JsError> = std::result::Result<T, E>;

thread_local! {
    static SETTINGS: RefCell<Option<Settings>> = RefCell::new(None);
    static CORE: RefCell<Core> = RefCell::new(Core::empty());
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
struct Message {
    arg: Vec<u8>,
    canister_id: Vec<u8>,
    ingress_expiry: String,
    method_name: String,
    nonce: Vec<u8>,
    request_type: String,
    sender: Vec<u8>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
struct Response {
    value: Vec<u8>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
struct LiveCanister {
    alias: String,
    file: String,
    source: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
struct Settings {
    verbosity: usize,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn js_log(s: &str);
}

fn js_input<T: DeserializeOwned>(input: JsValue) -> Result<T> {
    from_value(input).map_err(|e| JsError::new(&format!("Deserialization error ({:?})", e)))
}

fn js_return<T: Serialize>(value: &T) -> Result {
    to_value(value).map_err(|e| JsError::new(&format!("Serialization error ({:?})", e)))
}

fn js_error(error: impl Into<Interruption>) -> JsError {
    JsError::new(&format!("{:?}", error.into()))
}

fn motoko_to_js_value(value: &Value) -> Result {
    // TODO: replace with Candid
    Ok(match value {
        Value::Null => JsValue::null(),
        Value::Bool(b) => JsValue::from_bool(*b),
        Value::Unit => JsValue::undefined(),
        Value::Nat(n) => JsValue::from_str(&n.to_string()),
        Value::Int(i) => JsValue::from_str(&i.to_string()),
        Value::Float(f) => JsValue::from_f64(f.0),
        Value::Char(c) => JsValue::from_str(&c.to_string()),
        Value::Text(s) => JsValue::from_str(&s.to_string()),
        Value::Option(o) => motoko_to_js_value(o)?,
        _ => todo!(),
    })
}

fn with_settings<R>(f: impl FnOnce(&Settings) -> R) -> R {
    SETTINGS.with(|settings| {
        f(&mut settings
            .borrow_mut()
            .as_ref()
            .expect("Uninitialized settings"))
    })
}

macro_rules! log {
    ($($input:tt)+) => {
        with_settings(|settings| {
            if settings.verbosity >= 2 {
                js_log(&format!($($input)+))
            }
        })
    };
}

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn update_settings(settings: JsValue) -> Result {
    let settings: Settings = js_input(settings)?;
    SETTINGS.with(|s| *s.borrow_mut() = Some(settings));
    Ok(JsValue::TRUE)
}

/// Handle a message directed at the IC replica.
#[wasm_bindgen]
pub fn handle_message(_alias: String, _method: String, _message: JsValue) -> Result {
    // let message: Vec<u8> = from_value(message)?;
    // let args = candid::decode_args(&message)?;
    // log!("Candid args: {:?}", args);
    // js_return(&candid::encode_one("abc")?)
    unimplemented!()
}

/// Directly call a canister from JavaScript.
#[wasm_bindgen]
pub fn call_canister(alias: String, method: String, _args: Vec<u8>) -> Result {
    log!("[wasm] calling canister: {}.{}", alias, method);
    // let args = motoko::candid_utils::decode_candid_args(&args)?.share(); // TODO
    let args = ().to_shared().map_err(js_error)?; ////
    log!("[wasm] input: {:?}", args);
    CORE.with(|core| {
        let mut new_core = core.borrow().clone();
        let id = motoko::value::ActorId::Alias(alias.to_id());
        let limits = Limits::none();
        let value = new_core
            .call(&id, &method.to_id(), args, &limits)
            .map_err(js_error)?;
        // TODO: don't update the core for `query` methods
        *core.borrow_mut() = new_core;
        motoko_to_js_value(&value)
    })
}

/// Create or update a canister. Returns `true` if a canister was successfully updated.
#[wasm_bindgen]
pub fn update_canister(path: String, alias: String, source: String) -> Result {
    log!("[wasm] updating canister: {}", alias);
    CORE.with(|core| {
        // let mut core = core.borrow_mut();
        let id = motoko::value::ActorId::Alias(alias.to_id());
        let mut new_core = core.borrow().clone();
        new_core.set_actor(path, id, &source).map_err(js_error)?;
        *core.borrow_mut() = new_core;
        js_return(&())
        // js_return(&result.is_ok())
    })
}

/// Remove a canister if it exists. Returns `true` if a canister was successfully removed.
#[wasm_bindgen]
pub fn remove_canister(alias: String) -> Result {
    log!("[wasm] removing canister: {}", alias);
    CORE.with(|core| {
        let mut core = core.borrow_mut();
        let id = motoko::value::ActorId::Alias(alias.to_id());
        js_return(&core.actors.map.remove(&id).is_some())
    })
}

#[wasm_bindgen]
pub fn candid_to_js(candid: String) -> Result {
    use candid::{check_prog, IDLProg, TypeEnv};
    let ast = candid
        .parse::<IDLProg>()
        .map_err(|err| JsError::new(&err.to_string()))?;
    let mut env = TypeEnv::new();
    let actor = check_prog(&mut env, &ast).map_err(|err| JsError::new(&err.to_string()))?;
    js_return(&candid::bindings::javascript::compile(&env, &actor))
}
