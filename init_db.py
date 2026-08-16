import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "database.db")

conn = sqlite3.connect(DATABASE)
cursor = conn.cursor()

# Create users table
cursor.execute("""
CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password TEXT NOT NULL,
    profile_photo TEXT DEFAULT NULL
)
""")

# Create locations table
cursor.execute("""
CREATE TABLE IF NOT EXISTS locations(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    event_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
)
""")
cursor.execute("""
CREATE TABLE IF NOT EXISTS live_locations (
    user_id INTEGER PRIMARY KEY,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
)
""")               

cursor.execute("""
CREATE TABLE IF NOT EXISTS emergency_contacts (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    fullname TEXT NOT NULL,

    phone TEXT NOT NULL,

    email TEXT,

    relationship TEXT,

    is_primary INTEGER DEFAULT 0,

    FOREIGN KEY(user_id) REFERENCES users(id)

)
""")
cursor.execute("""
CREATE TABLE IF NOT EXISTS shared_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    latitude REAL,
    longitude REAL,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS incident_reports (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER,

    incident_type TEXT NOT NULL,

    severity TEXT NOT NULL,

    description TEXT NOT NULL,

    latitude REAL,

    longitude REAL,

    image TEXT,

    anonymous INTEGER DEFAULT 0,

    status TEXT DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id) REFERENCES users(id)

)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,

    emergency_alerts INTEGER DEFAULT 1,
    danger_zone_alerts INTEGER DEFAULT 1,
    nearby_user_alerts INTEGER DEFAULT 0,
    incident_report_updates INTEGER DEFAULT 1,
    location_sharing_alerts INTEGER DEFAULT 1,
    sound INTEGER DEFAULT 1,
    vibration INTEGER DEFAULT 1,

    location_sharing INTEGER DEFAULT 1,
    danger_zone_detection INTEGER DEFAULT 1,
    live_location_updates INTEGER DEFAULT 1,
    save_location_sos INTEGER DEFAULT 1,

    fake_call_ringtone TEXT DEFAULT 'classic',
    fake_call_vibration INTEGER DEFAULT 1,
    fake_call_delay INTEGER DEFAULT 5,
    caller_name TEXT DEFAULT 'Mom',

    anonymous_reports INTEGER DEFAULT 0,
    share_name_emergency INTEGER DEFAULT 0,
    share_phone_emergency INTEGER DEFAULT 0,
    show_location_to_others INTEGER DEFAULT 0,

    language TEXT DEFAULT 'English',
    sound_effects INTEGER DEFAULT 1,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS emergency_recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS nearby_emergency_alerts (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sender_id INTEGER NOT NULL,

    receiver_id INTEGER NOT NULL,

    latitude REAL NOT NULL,

    longitude REAL NOT NULL,

    message TEXT DEFAULT 'Emergency reported nearby',

    sender_name TEXT,

    sender_phone TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    is_read INTEGER DEFAULT 0,

    FOREIGN KEY(sender_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY(receiver_id)
        REFERENCES users(id)
        ON DELETE CASCADE

)
""")

conn.commit()
conn.close()

print("✅ Database initialized successfully!")
print("Database location:", DATABASE)