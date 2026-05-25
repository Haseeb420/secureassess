use sqlx::{SqlitePool, Error};
use log::info;

use super::schema::{CREATE_EVENTS, CREATE_SESSIONS, CREATE_SNAPSHOTS, CREATE_SYNC_QUEUE};

/// Create the pool and run all schema migrations.
pub async fn init_pool(db_url: &str) -> Result<SqlitePool, Error> {
    let pool = SqlitePool::connect(db_url).await?;
    run_migrations(&pool).await?;
    Ok(pool)
}

pub async fn run_migrations(db: &SqlitePool) -> Result<(), Error> {
    info!("Running DB migration: assessment_sessions");
    sqlx::query(CREATE_SESSIONS).execute(db).await?;

    info!("Running DB migration: code_snapshots");
    sqlx::query(CREATE_SNAPSHOTS).execute(db).await?;

    info!("Running DB migration: security_events");
    sqlx::query(CREATE_EVENTS).execute(db).await?;

    info!("Running DB migration: sync_queue");
    sqlx::query(CREATE_SYNC_QUEUE).execute(db).await?;

    info!("All DB migrations complete");
    Ok(())
}
