// #// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use tauri::{command, Manager}; // Add Manager trait here

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
    println!("Creating prediction with token: {}...", if api_token.len() > 5 { &api_token[0..5] } else { &api_token });
    println!("Request data: {:?}", request_data);

    let client = reqwest::Client::new();

    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Token {}", api_token)).map_err(|e| {
            println!("Error creating auth header: {}", e);
            e.to_string()
        })?,
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    println!("Sending request to Replicate API...");
    let response = client
        .post("https://api.replicate.com/v1/predictions")
        .headers(headers)
        .json(&request_data)
        .send()
        .await
        .map_err(|e| {
            println!("Error sending request: {}", e);
            e.to_string()
        })?;

    let status = response.status();
    println!("Received response with status: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.map_err(|e| {
            println!("Error reading error response: {}", e);
            e.to_string()
        })?;
        println!("API error: {} - {}", status, error_text);
        return Err(format!("API error ({}): {}", status, error_text));
    }

    let response_text = response.text().await.map_err(|e| {
        println!("Error reading response text: {}", e);
        e.to_string()
    })?;

    println!("Response text: {}", response_text);

    let response_data: ReplicateResponse = serde_json::from_str(&response_text).map_err(|e| {
        println!("Error parsing JSON: {}", e);
        e.to_string()
    })?;

    println!("Parsed response: {:?}", response_data);
    Ok(response_data)
}

#[command]
async fn get_prediction(
    api_token: String,
    prediction_id: String,
) -> Result<ReplicateResponse, String> {
    println!("Getting prediction {} with token: {}...", prediction_id, if api_token.len() > 5 { &api_token[0..5] } else { &api_token });

    let client = reqwest::Client::new();

    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Token {}", api_token)).map_err(|e| {
            println!("Error creating auth header: {}", e);
            e.to_string()
        })?,
    );

    println!("Sending request to get prediction status...");
    let response = client
        .get(&format!(
            "https://api.replicate.com/v1/predictions/{}",
            prediction_id
        ))
        .headers(headers)
        .send()
        .await
        .map_err(|e| {
            println!("Error sending request: {}", e);
            e.to_string()
        })?;

    let status = response.status();
    println!("Received response with status: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.map_err(|e| {
            println!("Error reading error response: {}", e);
            e.to_string()
        })?;
        println!("API error: {} - {}", status, error_text);
        return Err(format!("API error ({}): {}", status, error_text));
    }

    let response_text = response.text().await.map_err(|e| {
        println!("Error reading response text: {}", e);
        e.to_string()
    })?;

    println!("Response text: {}", response_text);

    let response_data: ReplicateResponse = serde_json::from_str(&response_text).map_err(|e| {
        println!("Error parsing JSON: {}", e);
        e.to_string()
    })?;

    println!("Parsed response: {:?}", response_data);
    Ok(response_data)
}

fn main() {
    println!("Starting Elixir Editor application...");

    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
                println!("DevTools opened for debugging");
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
