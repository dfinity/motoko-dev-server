use motoko::vm_types::Core;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use std::cell::RefCell;
use wasm_bindgen::prelude::*;

type Result<T = JsValue, E = JsError> = std::result::Result<T, E>;

thread_local! {
    static CORE: RefCell<Core>  = RefCell::new(Core::empty());
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
struct LiveCanister {
    alias: String,
    file: String,
    source: String,
}

#[wasm_bindgen]
extern "C" {
    // fn alert(s: &str);
}

fn js_return<T: Serialize>(value: &T) -> Result {
    to_value(value).map_err(|e| JsError::new(&format!("Serialization error ({:?})", e)))
}

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Handle a message directed at the IC replica.
#[wasm_bindgen]
pub fn handle_message(_alias: String, _method: String, message: JsValue) -> Result {
    let message: Message = from_value(message)?;

    let args = candid::decode_args(&message.arg)?;

    println!("Candid args: {:?}", args);

    js_return(&candid::encode_one("abc")?)
}

/// Create or update a canister. Returns `true` if a canister was successfully updated.
#[wasm_bindgen]
pub fn update_canister(_alias: String, source: String) -> Result<bool> {
    CORE.with(|core| {
        // TODO: multiple canisters, error handling
        let result = core.get_mut().eval(&source);
        js_return(&result.is_ok())
    })
}

/// Remove a canister if it exists. Returns `true` if a canister was successfully removed.
#[wasm_bindgen]
pub fn remove_canister(_alias: String, source: String) -> Result {
    CORE.with(|core| {
        // TODO
        js_return(&true)
    })
}
