pub mod commands;
pub mod encryption;
pub mod migrations;
pub mod models;
pub mod schema;

use sqlx::SqlitePool;

/// Newtype wrapping the pool so it can be stored in Tauri managed state.
pub struct DbPool(pub SqlitePool);
