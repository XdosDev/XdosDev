-- Apply only to the approved, dedicated D1 database before a staged release.
-- Aggregate counters only. No names, emails, IP addresses or message bodies.
CREATE TABLE IF NOT EXISTS contact_send_budget (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    utc_day INTEGER NOT NULL,
    day_count INTEGER NOT NULL CHECK (day_count >= 0),
    utc_hour INTEGER NOT NULL,
    hour_count INTEGER NOT NULL CHECK (hour_count >= 0)
);
INSERT OR IGNORE INTO contact_send_budget (id, utc_day, day_count, utc_hour, hour_count)
VALUES (1, -1, 0, -1, 0);
