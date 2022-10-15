use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

type Result<T = JsValue, E = JsError> = std::result::Result<T, E>;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
struct Message {
    arg: Vec<u8>,
    canister_id: Vec<u8>,
    ingress_expiry: String,
    method_name: String,
    request_type: String,
    sender: Vec<u8>,
}

#[wasm_bindgen]
extern "C" {
    // fn alert(s: &str);
}

fn js_return<T: Serialize>(value: &T) -> Result {
    JsValue::from_serde(value)
        .map_err(|e| JsError::new(&format!("Serialization error ({:?})", e.classify())))
}

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn handle_message(message: JsValue) -> Result {
    let message: Message = message.into_serde()?;

    println!("Candid: {:?}", message.arg);

    js_return(&message)
}
