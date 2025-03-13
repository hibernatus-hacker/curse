// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::{Client, header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE}};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::{command, Manager};

// Global HTTP client for connection pooling
static CLIENT: OnceLock<Client> = OnceLock::new();

fn get_client() -> &'static Client {
    CLIENT.get_or_init(|| {
        Client::builder()
            .pool_idle_timeout(std::time::Duration::from_secs(30))
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .expect("Failed to create HTTP client")
    })
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ReplicateRequest {
    version: String,
    input: serde_json::Value,
    stream: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ReplicateResponse {
    id: Option<String>,
    status: Option<String>,
    output: Option<serde_json::Value>,
    error: Option<String>,
    detail: Option<String>,
}

#[command]
async fn create_prediction(
    api_token: String,
    request_data: ReplicateRequest,
) -> Result<ReplicateResponse, String> {
    let client = get_client();

    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Token {}", api_token))
            .map_err(|e| e.to_string())?,
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    let response = client
        .post("https://api.replicate.com/v1/predictions")
        .headers(headers)
        .json(&request_data)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.map_err(|e| e.to_string())?;
        return Err(format!("API error ({}): {}", status, error_text));
    }

    response.json::<ReplicateResponse>().await
        .map_err(|e| e.to_string())
}

#[command]
async fn get_prediction(
    api_token: String,
    prediction_id: String,
) -> Result<ReplicateResponse, String> {
    let client = get_client();

    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Token {}", api_token))
            .map_err(|e| e.to_string())?,
    );

    let response = client
        .get(&format!(
            "https://api.replicate.com/v1/predictions/{}",
            prediction_id
        ))
        .headers(headers)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.map_err(|e| e.to_string())?;
        return Err(format!("API error ({}): {}", status, error_text));
    }

    response.json::<ReplicateResponse>().await
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            create_prediction,
            get_prediction,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
