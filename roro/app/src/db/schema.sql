PRAGMA foreign_keys = ON;

-- ------------------------------
-- Table: user
-- ------------------------------
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    username TEXT NOT NULL UNIQUE,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    created_at DATE NOT NULL,
    last_login_at DATETIME,
    CHECK (
        email LIKE '%_@_%._%' AND
        LENGTH(email) - LENGTH(REPLACE(email, '@', '')) = 1 -- AND
        -- SUBSTR(LOWER(email), 1, INSTR(email, '.') - 1) NOT GLOB '*[^@0-9a-z]*' AND
        -- SUBSTR(LOWER(email), INSTR(email, '.') + 1) NOT GLOB '*[^a-z]*'
    )
);

-- ------------------------------
-- Table: match
-- ------------------------------
CREATE TABLE IF NOT EXISTS match (
    id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    player_1 INTEGER NOT NULL,
    score_player_1 INTEGER NOT NULL,
    player_2 INTEGER NOT NULL,
    score_player_2 INTEGER NOT NULL,
    winner INTEGER NOT NULL,
    date DATETIME NOT NULL,
    FOREIGN KEY (player_1) REFERENCES user (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (player_2) REFERENCES user (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (winner) REFERENCES user (id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- ------------------------------
-- Table: session
-- ------------------------------
CREATE TABLE IF NOT EXISTS session (
    sid TEXT PRIMARY KEY UNIQUE NOT NULL,
    session TEXT NOT NULL,
    expires DATETIME NOT NULL
);

-- ------------------------------
-- Table: conversations
-- ------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,
    UNIQUE(user1_id, user2_id),
    FOREIGN KEY (user1_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES user(id) ON DELETE CASCADE
);

-- ------------------------------
-- Table: messages
-- ------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_offset TEXT UNIQUE,
    content TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES user(id) ON DELETE CASCADE
);

-- ------------------------------
-- Table: blocked users
-- ------------------------------
CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    UNIQUE(blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES user(id) ON DELETE CASCADE
);