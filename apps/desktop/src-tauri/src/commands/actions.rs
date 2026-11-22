use tauri::{
    ipc::{InvokeBody, Request},
    AppHandle, Manager,
};

use crate::services::{
    actions::{self, ActionReport, ActionRequest, FinishPageImagesRequest, PageImagesRequest},
    pdf::save_images::{self, PageImageSessions, SavePageParams, PAGE_ERROR},
    tasks::{self, TaskRecord},
};

const SESSION_HEADER: &str = "x-glup-session";
const PAGE_HEADER: &str    = "x-glup-page";

// Heavy image work runs on a blocking worker, so the island never freezes.
// The task is registered before it starts and its result stored when it ends, so it completes and stays
// available (get_active_tasks) even if nobody is waiting for this call anymore.
#[tauri::command]
pub async fn run_action(app: AppHandle, request: ActionRequest) -> Result<ActionReport, String> {
    let task = request.task_id.clone();

    if let Some(task) = &task {
        tasks::start(&app, task, &request.action_id);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || actions::run(&worker, request))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish(&app, task, &result);
    }

    result
}

// #[tauri::command]
// pub async fn run_action(app: AppHandle, request: ActionRequest) -> Result<ActionReport, String> {
//     tauri::async_runtime::spawn_blocking(move || actions::run(&app, request))
//         .await
//         .map_err(|error| error.to_string())?
// }

#[tauri::command]
pub fn get_active_tasks(app: AppHandle) -> Vec<TaskRecord> {
    tasks::list(&app)
}

#[tauri::command]
pub fn dismiss_task(app: AppHandle, id: String) {
    tasks::dismiss(&app, &id);
}

// The file in progress finishes; the next ones are not started.
#[tauri::command]
pub fn cancel_action(app: AppHandle) {
    actions::cancel(&app);
}

#[tauri::command]
pub fn begin_page_images(app: AppHandle, request: PageImagesRequest) -> Result<u64, String> {
    actions::begin_page_images(&app, request)
}

fn header_number<T: std::str::FromStr>(request: &Request<'_>, name: &str) -> Option<T> {
    request.headers().get(name)?.to_str().ok()?.parse().ok()
}

// One rendered page as raw bytes (no JSON), with the session and page number in headers.
#[tauri::command]
pub fn save_page_image(app: AppHandle, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(PAGE_ERROR.to_string());
    };

    let session = header_number::<u64>(&request, SESSION_HEADER).ok_or(PAGE_ERROR)?;
    let page    = header_number::<u32>(&request, PAGE_HEADER).ok_or(PAGE_ERROR)?;

    save_images::save_page(SavePageParams { sessions: &app.state::<PageImageSessions>(), session, page, bytes })
}

#[tauri::command]
pub fn finish_page_images(app: AppHandle, request: FinishPageImagesRequest) -> Result<ActionReport, String> {
    actions::finish_page_images(&app, request)
}
