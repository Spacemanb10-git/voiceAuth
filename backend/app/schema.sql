-- Campus Gate Entry System
--
-- photo_ids        one row per stored photo of a delivery agent
-- delivery_agents  one row per agent (identified by Aadhaar); points at their photo
-- delivery_orders  one row per gate entry / delivery, linked to the agent

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS photo_ids (
    photo_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    photo        BLOB    NOT NULL,
    mime_type    TEXT    NOT NULL DEFAULT 'image/jpeg',
    captured_at  TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_agents (
    agent_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    aadhaar_number  TEXT    NOT NULL UNIQUE CHECK (length(aadhaar_number) = 12),
    mobile_number   TEXT    NOT NULL CHECK (length(mobile_number) = 10),
    photo_id        INTEGER NOT NULL UNIQUE
                    REFERENCES photo_ids (photo_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_orders (
    order_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_person_id  INTEGER NOT NULL
                        REFERENCES delivery_agents (agent_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    app                 TEXT    NOT NULL,
    hostel              TEXT    NOT NULL,
    student_name        TEXT    NOT NULL,
    entered_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_person ON delivery_orders (delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_orders_entered ON delivery_orders (entered_at);
