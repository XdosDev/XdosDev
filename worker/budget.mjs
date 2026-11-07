// One atomic primary-database write reserves capacity before any Brevo attempt.
// Counts attempts, not deliveries. Failed/uncertain sends are never refunded.
export async function reserveSendBudget(db, dailyLimit, hourlyLimit) {
    if (!db?.prepare || !Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 1000 ||
        !Number.isInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > dailyLimit) {
        throw new Error('Invalid send-budget configuration');
    }
    // SQLite's clock is stable within one statement. Never use a caller's
    // edge clock: delayed requests must not reset stored windows backwards.
    const row = await db.prepare(`UPDATE contact_send_budget SET
        day_count = CASE WHEN utc_day = CAST(unixepoch() / 86400 AS INTEGER) THEN day_count ELSE 0 END + 1,
        hour_count = CASE WHEN utc_hour = CAST(unixepoch() / 3600 AS INTEGER) THEN hour_count ELSE 0 END + 1,
        utc_day = CAST(unixepoch() / 86400 AS INTEGER), utc_hour = CAST(unixepoch() / 3600 AS INTEGER)
        WHERE id = 1 AND (utc_day != CAST(unixepoch() / 86400 AS INTEGER) OR day_count < ?1)
        AND (utc_hour != CAST(unixepoch() / 3600 AS INTEGER) OR hour_count < ?2)
        RETURNING day_count, hour_count`)
        .bind(dailyLimit, hourlyLimit).first();
    // Missing/uninitialized row fails closed too. Never issue a second write to
    // initialize it here, which could accidentally reset an existing budget.
    return row !== null;
}
