import os
import psycopg2


# =========================================================
# DATABASE CONNECTION
# =========================================================

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured."
    )


conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()


# =========================================================
# USERS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    fullname TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password TEXT NOT NULL,
    profile_photo TEXT DEFAULT NULL
)
""")


# =========================================================
# LOCATIONS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS locations(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    event_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
)
""")


# =========================================================
# LIVE LOCATIONS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS live_locations(
    user_id INTEGER PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
)
""")


# =========================================================
# EMERGENCY CONTACTS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS emergency_contacts(

    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    fullname TEXT NOT NULL,

    phone TEXT NOT NULL,

    email TEXT,

    relationship TEXT,

    is_primary INTEGER DEFAULT 0,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
)
""")


# =========================================================
# SHARED LOCATIONS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS shared_locations(

    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    contact_id INTEGER NOT NULL,

    latitude DOUBLE PRECISION,

    longitude DOUBLE PRECISION,

    expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")


# =========================================================
# INCIDENT REPORTS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS incident_reports(

    id SERIAL PRIMARY KEY,

    user_id INTEGER,

    incident_type TEXT NOT NULL,

    severity TEXT NOT NULL,

    description TEXT NOT NULL,

    latitude DOUBLE PRECISION,

    longitude DOUBLE PRECISION,

    image TEXT,

    anonymous INTEGER DEFAULT 0,

    status TEXT DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
)
""")


# =========================================================
# USER SETTINGS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS user_settings(

    id SERIAL PRIMARY KEY,

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

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
)
""")


# =========================================================
# EMERGENCY RECORDINGS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS emergency_recordings(

    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    filename TEXT NOT NULL,

    duration INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
)
""")


# =========================================================
# NEARBY EMERGENCY ALERTS
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS nearby_emergency_alerts(

    id SERIAL PRIMARY KEY,

    sender_id INTEGER NOT NULL,

    receiver_id INTEGER NOT NULL,

    latitude DOUBLE PRECISION NOT NULL,

    longitude DOUBLE PRECISION NOT NULL,

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


# =========================================================
# SAVE CHANGES
# =========================================================

conn.commit()

cursor.close()
conn.close()


print("✅ PostgreSQL database initialized successfully!")
