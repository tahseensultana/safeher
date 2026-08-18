import os
import math
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import sqlite3
import psycopg2
import requests
from flask import Flask, flash, jsonify, render_template, request, redirect, url_for,session

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "SafeHer")

TEXTBEE_API_KEY = os.getenv("TEXTBEE_API_KEY")
TEXTBEE_DEVICE_ID = os.getenv("TEXTBEE_DEVICE_ID")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "database.db")
DATABASE_URL = os.environ.get("DATABASE_URL")


def get_db_connection():

    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is not configured."
        )

    return psycopg2.connect(
        DATABASE_URL
    )

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/login', methods=['GET', 'POST'])
def login():

    if request.method == 'POST':

        email = request.form.get("email")
        password = request.form.get("password")

        # Admin Login
        if email == "admin@safeher.com" and password == "admin123":
            session.clear()
            session["admin"] = True
            return redirect(url_for("admin_dashboard"))

        # Normal User Login
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM users WHERE email=? AND password=?",
            (email, password)
        )

        user = cursor.fetchone()
        conn.close()

        if user:
            session.clear()
            session["user_id"] = user[0]
            session["fullname"] = user[1]
            return redirect(url_for("dashboard"))

        return render_template(
            "login.html",
            error="Invalid email or password."
        )

    return render_template("login.html")
    
@app.route('/register', methods=['GET', 'POST'])
def register():

    if request.method == 'POST':

        fullname = request.form['fullname']
        email = request.form['email']
        phone = request.form['phone']
        password = request.form['password']

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()

        try:

            cursor.execute("""
            INSERT INTO users(fullname,email,phone,password)
            VALUES(?,?,?,?)
            """, (fullname, email, phone, password))

            conn.commit()

            return redirect(url_for('login'))

        except sqlite3.IntegrityError:

            return "Email already exists!"

        finally:

            conn.close()

    return render_template("register.html")

@app.route('/get-started')
def get_started():
    return render_template('get_started.html')

@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect(url_for("login"))

    user_id = session["user_id"]

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # ========================================
    # GET USER
    # ========================================

    cursor.execute("""
        SELECT id, fullname, email, phone
        FROM users
        WHERE id = ?
    """, (user_id,))

    user = cursor.fetchone()

    if user is None:
        conn.close()
        session.clear()
        return redirect(url_for("login"))

    # ========================================
    # GET LOCATION SETTINGS
    # ========================================

    cursor.execute("""
        SELECT
            location_sharing,
            live_location_updates,
            show_location_to_others
        FROM user_settings
        WHERE user_id = ?
    """, (user_id,))

    location_settings = cursor.fetchone()

    conn.close()

    # ========================================
    # RENDER DASHBOARD
    # ========================================

    return render_template(
        "dashboard.html",
        user=user,
        location_settings=location_settings
    )
    
@app.route("/profile")
def profile():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT fullname, email, phone, profile_photo
        FROM users
        WHERE id = ?
    """, (session["user_id"],))

    user = cursor.fetchone()

    conn.close()

    return render_template(
        "profile.html",
        user=user
    )
    
@app.route("/update-profile", methods=["POST"])
def update_profile():

    if "user_id" not in session:
        return redirect(url_for("login"))

    user_id = session["user_id"]

    fullname = request.form.get("fullname", "").strip()
    email = request.form.get("email", "").strip()
    phone = request.form.get("phone", "").strip()

    photo = request.files.get("profile_photo")

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE users
        SET fullname = ?,
            email = ?,
            phone = ?
        WHERE id = ?
    """, (
        fullname,
        email,
        phone,
        user_id
    ))

    if photo and photo.filename:

        filename = secure_filename(photo.filename)

        allowed = {
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp"
        }

        extension = filename.rsplit(".", 1)[-1].lower()

        if extension in allowed:

            upload_folder = os.path.join(
                app.root_path,
                "static",
                "uploads",
                "profile"
            )

            os.makedirs(upload_folder, exist_ok=True)

            new_filename = f"user_{user_id}.{extension}"

            photo.save(
                os.path.join(
                    upload_folder,
                    new_filename
                )
            )

            cursor.execute("""
                UPDATE users
                SET profile_photo = ?
                WHERE id = ?
            """, (
                new_filename,
                user_id
            ))

    conn.commit()
    conn.close()

    return redirect(url_for("profile"))

@app.route("/change-password", methods=["POST"])
def change_password():

    current = request.form["current_password"]
    new = request.form["new_password"]
    confirm = request.form["confirm_password"]

    return redirect(url_for("profile"))


@app.route("/history")
def history():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""

        SELECT id,
               latitude,
               longitude,
               event_type,
               created_at

        FROM locations

        WHERE user_id=?

        ORDER BY created_at DESC

    """,(session["user_id"],))

    history = cursor.fetchall()

    conn.close()

    return render_template(
        "history.html",
        history=history
    )


@app.route("/settings", methods=["GET", "POST"])
def settings():

    if "user_id" not in session:
        return redirect(url_for("login"))

    user_id = session["user_id"]

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # ========================================
    # CREATE DEFAULT SETTINGS IF NOT EXISTS
    # ========================================

    cursor.execute("""
        SELECT *
        FROM user_settings
        WHERE user_id = ?
    """, (user_id,))

    existing_settings = cursor.fetchone()

    if existing_settings is None:

        cursor.execute("""
            INSERT INTO user_settings (
                user_id,

                emergency_alerts,
                danger_zone_alerts,
                nearby_user_alerts,
                incident_report_updates,
                location_sharing_alerts,

                sound,
                vibration,

                location_sharing,
                danger_zone_detection,
                live_location_updates,
                save_location_sos,

                fake_call_ringtone,
                fake_call_vibration,
                fake_call_delay,
                caller_name,

                anonymous_reports,
                show_location_to_others,
                share_name_emergency,
                share_phone_emergency,

                
                language,
                sound_effects
            )

            VALUES (
                ?,

                1,
                1,
                1,
                1,
                1,

                1,
                1,

                1,
                1,
                1,
                1,

                'classic',
                1,
                5,
                'Mom',

                0,
                0,
                0,
                0,

                'English',
                1
            )
        """, (user_id,))

        conn.commit()

    # ========================================
    # SAVE SETTINGS
    # ========================================

    if request.method == "POST":

        # ----------------------------------------
        # CHECKBOXES
        # ----------------------------------------

        emergency_alerts = (
            1 if request.form.get("emergency_alerts") else 0
        )

        danger_zone_alerts = (
            1 if request.form.get("danger_zone_alerts") else 0
        )

        nearby_user_alerts = (
            1 if request.form.get("nearby_user_alerts") else 0
        )

        incident_report_updates = (
            1 if request.form.get("incident_report_updates") else 0
        )

        location_sharing_alerts = (
            1 if request.form.get("location_sharing_alerts") else 0
        )

        sound = (
            1 if request.form.get("sound") else 0
        )

        vibration = (
            1 if request.form.get("vibration") else 0
        )

        location_sharing = (
            1 if request.form.get("location_sharing") else 0
        )

        danger_zone_detection = (
            1 if request.form.get("danger_zone_detection") else 0
        )

        live_location_updates = (
            1 if request.form.get("live_location_updates") else 0
        )

        save_location_sos = (
            1 if request.form.get("save_location_sos") else 0
        )

        fake_call_vibration = (
            1 if request.form.get("fake_call_vibration") else 0
        )

        anonymous_reports = (
            1 if request.form.get("anonymous_reports") else 0
        )

        show_location_to_others = (
            1 if request.form.get("show_location_to_others") else 0
        )

        share_name_emergency = (
            1 if request.form.get("share_name_emergency") else 0
        )

        share_phone_emergency = (
            1 if request.form.get("share_phone_emergency") else 0
        )


        sound_effects = (
            1 if request.form.get("sound_effects") else 0
        )

        # ----------------------------------------
        # SELECT INPUTS
        # ----------------------------------------

        fake_call_ringtone = request.form.get(
            "fake_call_ringtone",
            "classic"
        )

        fake_call_delay = request.form.get(
            "fake_call_delay",
            "5"
        )

        caller_name = request.form.get(
            "caller_name",
            "Mom"
        ).strip()

        language = request.form.get(
            "language",
            "English"
        )

        # ----------------------------------------
        # VALIDATE DELAY
        # ----------------------------------------

        try:
            fake_call_delay = int(fake_call_delay)
        except ValueError:
            fake_call_delay = 5

        # ----------------------------------------
        # UPDATE DATABASE
        # ----------------------------------------

        cursor.execute("""
            UPDATE user_settings

            SET

                emergency_alerts = ?,
                danger_zone_alerts = ?,
                nearby_user_alerts = ?,
                incident_report_updates = ?,
                location_sharing_alerts = ?,

                sound = ?,
                vibration = ?,

                location_sharing = ?,
                danger_zone_detection = ?,
                live_location_updates = ?,
                save_location_sos = ?,

                fake_call_ringtone = ?,
                fake_call_vibration = ?,
                fake_call_delay = ?,
                caller_name = ?,

                anonymous_reports = ?,
                show_location_to_others = ?,
                share_name_emergency = ?,
                share_phone_emergency = ?,

                
                language = ?,
                sound_effects = ?

            WHERE user_id = ?

        """, (

            emergency_alerts,
            danger_zone_alerts,
            nearby_user_alerts,
            incident_report_updates,
            location_sharing_alerts,

            sound,
            vibration,

            location_sharing,
            danger_zone_detection,
            live_location_updates,
            save_location_sos,

            fake_call_ringtone,
            fake_call_vibration,
            fake_call_delay,
            caller_name,

            anonymous_reports,
            show_location_to_others,
            share_name_emergency,
            share_phone_emergency,

            
            language,
            sound_effects,

            user_id
        ))

        conn.commit()

    # ========================================
    # LOAD SETTINGS
    # ========================================

    cursor.execute("""
        SELECT *
        FROM user_settings
        WHERE user_id = ?
    """, (user_id,))

    settings = cursor.fetchone()

    conn.close()

    return render_template(
        "settings.html",
        settings=settings
    )
    
@app.route("/get-notification-settings")
def get_notification_settings():

    if "user_id" not in session:

        return jsonify({
            "success": False
        }), 401


    conn = sqlite3.connect(DATABASE)

    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()


    cursor.execute("""
        SELECT
            emergency_alerts,
            danger_zone_alerts,
            nearby_user_alerts,
            incident_report_updates,
            location_sharing_alerts,
            sound,
            vibration
        FROM user_settings
        WHERE user_id = ?
    """, (
        session["user_id"],
    ))


    settings = cursor.fetchone()

    conn.close()


    if not settings:

        return jsonify({
            "success": False
        })


    return jsonify({

        "success": True,

        "emergency_alerts":
            settings["emergency_alerts"],

        "danger_zone_alerts":
            settings["danger_zone_alerts"],

        "nearby_user_alerts":
            settings["nearby_user_alerts"],

        "incident_report_updates":
            settings["incident_report_updates"],

        "location_sharing_alerts":
            settings["location_sharing_alerts"],

        "sound":
            settings["sound"],

        "vibration":
            settings["vibration"]

    })
    
@app.route("/location")
def location():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Load emergency contacts
    cursor.execute("""
        SELECT id, fullname, phone, email
        FROM emergency_contacts
        WHERE user_id = ?
    """, (session["user_id"],))

    contacts = cursor.fetchall()

    # Load saved location if requested
    location_id = request.args.get("id")
    saved_location = None

    if location_id:
        cursor.execute("""
            SELECT latitude, longitude, event_type, created_at
            FROM locations
            WHERE id=? AND user_id=?
        """, (location_id, session["user_id"]))

        saved_location = cursor.fetchone()

    conn.close()

    return render_template(
        "location.html",
        saved_location=saved_location,
        contacts=contacts
    )
    
@app.route("/save-location", methods=["POST"])
def save_location():

    if "user_id" not in session:
        return jsonify({"success": False, "message": "Not logged in"})

    data = request.get_json()

    event_type = data.get("event_type", "Saved")

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO locations
        (user_id, latitude, longitude, event_type)
        VALUES (?, ?, ?, ?)
    """, (
        session["user_id"],
        data["latitude"],
        data["longitude"],
        event_type
    ))

    conn.commit()
    conn.close()

    return jsonify({"success": True})

@app.route("/share-location")
def share_location():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, fullname, phone
        FROM emergency_contacts
        WHERE user_id=?
        ORDER BY is_primary DESC, fullname
    """, (session["user_id"],))

    contacts = cursor.fetchall()

    return render_template(
    "location.html",
    saved_location=None,
    contacts=contacts
)
    
@app.route("/contacts")
def contacts():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""

        SELECT
        id,
        fullname,
        phone,
        email,
        relationship,
        is_primary

        FROM emergency_contacts

        WHERE user_id=?

        ORDER BY is_primary DESC,id DESC

    """,(session["user_id"],))

    contacts=cursor.fetchall()

    conn.close()

    return render_template(
        "contacts.html",
        contacts=contacts
    )
    
@app.route("/add-contact",methods=["POST"])
def add_contact():

    if "user_id" not in session:
        return redirect(url_for("login"))

    fullname=request.form["fullname"]
    phone=request.form["phone"]
    email=request.form["email"]
    relationship=request.form["relationship"]

    conn=sqlite3.connect(DATABASE)
    cursor=conn.cursor()

    cursor.execute("""

        INSERT INTO emergency_contacts(

        user_id,
        fullname,
        phone,
        email,
        relationship

        )

        VALUES(?,?,?,?,?)

    """,(

        session["user_id"],
        fullname,
        phone,
        email,
        relationship

    ))

    conn.commit()
    conn.close()

    flash("Emergency contact added successfully.","success")

    return redirect(url_for("contacts"))    

@app.route("/delete-contact/<int:id>")
def delete_contact(id):

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn=sqlite3.connect(DATABASE)
    cursor=conn.cursor()

    cursor.execute("""

        DELETE FROM emergency_contacts

        WHERE id=? AND user_id=?

    """,(id,session["user_id"]))

    conn.commit()
    conn.close()

    flash("Contact removed.","success")

    return redirect(url_for("contacts"))

@app.route("/update-contact", methods=["POST"])
def update_contact():

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""

        UPDATE emergency_contacts

        SET
        fullname=?,
        phone=?,
        email=?,
        relationship=?,
        is_primary=?

        WHERE id=? AND user_id=?

    """,(

        request.form["fullname"],
        request.form["phone"],
        request.form["email"],
        request.form["relationship"],
        request.form.get("is_primary",0),
        request.form["contact_id"],
        session["user_id"]

    ))

    conn.commit()
    conn.close()

    flash("Contact updated successfully!")

    return redirect(url_for("contacts"))

@app.route("/report-incident", methods=["GET", "POST"])
def report_incident():

    if "user_id" not in session:
        return redirect(url_for("login"))

    if request.method == "POST":

        incident = request.form["incident_type"]
        severity = request.form["severity"]
        description = request.form["description"]

        latitude = request.form["latitude"]
        longitude = request.form["longitude"]

        anonymous = 1 if request.form.get("anonymous") else 0

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()

        cursor.execute("""

        INSERT INTO incident_reports(

            user_id,
            incident_type,
            severity,
            description,
            latitude,
            longitude,
            anonymous

        )

        VALUES(?,?,?,?,?,?,?)

        """,(

            session["user_id"],
            incident,
            severity,
            description,
            latitude,
            longitude,
            anonymous

        ))

        conn.commit()
        conn.close()

        flash("Incident reported successfully.","success")

        return redirect(url_for("dashboard"))

    return render_template("report_incident.html")

@app.route("/check-danger-zones")
def check_danger_zones():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401


    # ========================================
    # GET USER LOCATION
    # ========================================

    latitude = request.args.get("latitude")
    longitude = request.args.get("longitude")


    if latitude is None or longitude is None:
        return jsonify({
            "success": False,
            "message": "Location required."
        }), 400


    try:

        latitude = float(latitude)
        longitude = float(longitude)

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": "Invalid location."
        }), 400


    # ========================================
    # CHECK USER SETTINGS
    # ========================================

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()


    cursor.execute("""
        SELECT
            danger_zone_detection,
            danger_zone_alerts
        FROM user_settings
        WHERE user_id = ?
    """, (session["user_id"],))


    settings = cursor.fetchone()


    # Default settings

    if settings:

        detection_enabled = settings["danger_zone_detection"]
        alerts_enabled = settings["danger_zone_alerts"]

    else:

        detection_enabled = 1
        alerts_enabled = 1


    # ========================================
    # DETECTION DISABLED
    # ========================================

    if detection_enabled != 1:

        conn.close()

        return jsonify({
            "success": True,
            "danger": False,
            "alerts_enabled": False,
            "zones": []
        })


    # ========================================
    # GET INCIDENT REPORTS
    # ========================================

    cursor.execute("""
        SELECT
            id,
            incident_type,
            severity,
            description,
            latitude,
            longitude,
            created_at
        FROM incident_reports
        WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND TRIM(latitude) != ''
        AND TRIM(longitude) != ''
        AND status != 'Rejected'
        ORDER BY created_at DESC
    """)


    incidents = cursor.fetchall()

    conn.close()


    # ========================================
    # CHECK DISTANCE
    # ========================================

    nearby_zones = []

    DANGER_RADIUS = 1.0   # 1 kilometer


    for incident in incidents:

        # ------------------------------------
        # Validate incident coordinates
        # ------------------------------------

        try:

            incident_latitude = float(
                incident["latitude"]
            )

            incident_longitude = float(
                incident["longitude"]
            )

        except (TypeError, ValueError):

            print(
                f"⚠️ Skipping incident "
                f"{incident['id']} "
                f"because coordinates are invalid: "
                f"{incident['latitude']}, "
                f"{incident['longitude']}"
            )

            continue


        # ------------------------------------
        # Calculate distance
        # ------------------------------------

        distance = calculate_distance(
            latitude,
            longitude,
            incident_latitude,
            incident_longitude
        )


        # ------------------------------------
        # Check danger radius
        # ------------------------------------

        if distance <= DANGER_RADIUS:

            nearby_zones.append({

                "id":
                    incident["id"],

                "incident_type":
                    incident["incident_type"],

                "severity":
                    incident["severity"],

                "description":
                    incident["description"],

                "latitude":
                    incident_latitude,

                "longitude":
                    incident_longitude,

                "distance":
                    round(distance, 3),

                "created_at":
                    incident["created_at"]

            })


    # ========================================
    # RESPONSE
    # ========================================

    return jsonify({

        "success": True,

        "danger":
            len(nearby_zones) > 0,

        "alerts_enabled":
            alerts_enabled == 1,

        "zones":
            nearby_zones

    })


@app.route("/admin/delete-user/<int:id>")
def admin_delete_user(id):

    if not session.get("admin"):
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    try:

      


        # Delete user's emergency contacts
        cursor.execute("""
            DELETE FROM emergency_contacts
            WHERE user_id = ?
        """, (id,))


        # Finally delete the user
        cursor.execute("""
            DELETE FROM users
            WHERE id = ?
        """, (id,))


        conn.commit()

    except Exception as e:

        conn.rollback()

        print("Delete user error:", e)

    finally:

        conn.close()


    return redirect(url_for("admin_dashboard"))

@app.route("/admin/incident/<int:id>")
def admin_view_incident(id):

    if not session.get("admin"):
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            incident_reports.*,
            COALESCE(users.fullname, 'Deleted User') AS fullname,
            COALESCE(users.email, 'No longer available') AS email,
            COALESCE(users.phone, 'No longer available') AS phone

        FROM incident_reports

        LEFT JOIN users
        ON incident_reports.user_id = users.id

        WHERE incident_reports.id = ?
    """, (id,))

    incident = cursor.fetchone()

    conn.close()

    if not incident:
        return redirect(url_for("admin_dashboard"))

    return render_template(
        "admin_incident.html",
        incident=incident
    )
    
@app.route("/admin/update-incident-status/<int:id>", methods=["POST"])
def admin_update_incident_status(id):

    # ========================================
    # ADMIN LOGIN CHECK
    # ========================================

    if not session.get("admin"):
        return redirect(url_for("login"))


    # ========================================
    # GET NEW STATUS
    # ========================================

    new_status = request.form.get("status")

    allowed_statuses = [
        "Pending",
        "Reviewing",
        "Resolved",
        "Rejected"
    ]

    if new_status not in allowed_statuses:

        flash(
            "Invalid incident status.",
            "danger"
        )

        return redirect(
            url_for(
                "admin_view_incident",
                id=id
            )
        )


    # ========================================
    # DATABASE
    # ========================================

    conn = sqlite3.connect(DATABASE)

    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()


    # ========================================
    # GET INCIDENT + USER
    # ========================================

    cursor.execute("""
        SELECT
            ir.id,
            ir.user_id,
            ir.incident_type,
            ir.status,
            u.fullname,
            u.email
        FROM incident_reports ir

        JOIN users u
            ON ir.user_id = u.id

        WHERE ir.id = ?
    """, (id,))

    incident = cursor.fetchone()


    # ========================================
    # INCIDENT NOT FOUND
    # ========================================

    if not incident:

        conn.close()

        flash(
            "Incident report not found.",
            "danger"
        )

        return redirect(
            url_for("admin_dashboard")
        )


    # ========================================
    # INCIDENT INFORMATION
    # ========================================

    old_status = incident["status"]

    user_id = incident["user_id"]

    user_name = incident["fullname"]

    user_email = incident["email"]

    incident_type = incident["incident_type"]


    # ========================================
    # UPDATE STATUS
    # ========================================

    cursor.execute("""
        UPDATE incident_reports

        SET status = ?

        WHERE id = ?
    """, (
        new_status,
        id
    ))

    conn.commit()


    # ========================================
    # CHECK NOTIFICATION SETTING
    # ========================================

    cursor.execute("""
        SELECT incident_report_updates
        FROM user_settings
        WHERE user_id = ?
    """, (user_id,))

    setting = cursor.fetchone()


    # ========================================
    # SEND EMAIL
    # ========================================

    if (
        old_status != new_status
        and
        setting
        and
        setting["incident_report_updates"] == 1
        and
        user_email
    ):

        try:

            # ====================================
            # BREVO API
            # ====================================

            brevo_url = "https://api.brevo.com/v3/smtp/email"

            brevo_headers = {
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json"
            }


            # ====================================
            # EMAIL CONTENT
            # ====================================

            brevo_payload = {

                "sender": {
                    "name": BREVO_SENDER_NAME,
                    "email": BREVO_SENDER_EMAIL
                },

                "to": [
                    {
                        "email": user_email,
                        "name": user_name
                    }
                ],

                "subject":
                    "📋 SafeHer Incident Report Update",

                "htmlContent": f"""
                <html>

                <body>

                    <h2>
                        📋 SafeHer Incident Report Update
                    </h2>

                    <p>
                        Hello {user_name},
                    </p>

                    <p>
                        Your SafeHer incident report
                        has been updated.
                    </p>

                    <p>

                        <strong>Incident:</strong>
                        {incident_type}

                        <br>

                        <strong>Previous Status:</strong>
                        {old_status}

                        <br>

                        <strong>New Status:</strong>
                        {new_status}

                    </p>

                    <p>
                        Please log in to your
                        SafeHer account for more
                        information.
                    </p>

                    <p>
                        This message was automatically
                        sent by SafeHer.
                    </p>

                </body>

                </html>
                """
            }


            # ====================================
            # SEND EMAIL
            # ====================================

            response = requests.post(
                brevo_url,
                headers=brevo_headers,
                json=brevo_payload,
                timeout=20
            )


            print(
                "📧 Brevo incident email status:",
                response.status_code
            )

            print(
                "📧 Brevo response:",
                response.text
            )


            if response.ok:

                print(
                    "✅ Incident update email sent to:",
                    user_email
                )

            else:

                print(
                    "❌ Brevo incident email failed."
                )


        except Exception as e:

            print(
                "❌ Incident email error:",
                e
            )


    elif old_status != new_status:

        print(
            "ℹ️ Incident report notifications disabled."
        )


    # ========================================
    # CLOSE DATABASE
    # ========================================

    conn.close()


    # ========================================
    # SUCCESS
    # ========================================

    flash(
        f"Incident status updated to {new_status}.",
        "success"
    )


    return redirect(
        url_for(
            "admin_view_incident",
            id=id
        )
    )   

@app.route("/police")
def police():

    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template("police.html")


@app.route("/hospital")
def hospital():

    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template("hospital.html")

def create_nearby_emergency_alert(
    sender_id,
    latitude,
    longitude
):

    conn = sqlite3.connect(DATABASE)

    cursor = conn.cursor()


    # ========================================
    # Get sender information
    # ========================================

    cursor.execute("""
        SELECT fullname, phone
        FROM users
        WHERE id=?
    """, (sender_id,))

    sender = cursor.fetchone()


    if not sender:

        conn.close()

        return


    sender_name = sender[0]
    sender_phone = sender[1]


    # ========================================
    # Get sender privacy settings
    # ========================================

    cursor.execute("""
        SELECT
            share_name_emergency,
            share_phone_emergency,
            show_location_to_others
        FROM user_settings
        WHERE user_id=?
    """, (sender_id,))

    settings = cursor.fetchone()


    if settings:

        share_name = settings[0]
        share_phone = settings[1]
        show_location = settings[2]

    else:

        share_name = 0
        share_phone = 0
        show_location = 1


    # ========================================
    # Find nearby users
    # ========================================

    cursor.execute("""
        SELECT
            u.id,
            u.fullname,
            u.phone,
            l.latitude,
            l.longitude
        FROM users u

        LEFT JOIN locations l
            ON l.user_id = u.id

        WHERE u.id != ?

        AND EXISTS (

            SELECT 1
            FROM user_settings us
            WHERE us.user_id = u.id
            AND us.nearby_user_alerts = 1

        )

        GROUP BY u.id

    """, (sender_id,))


    nearby_users = cursor.fetchall()


    # ========================================
    # Calculate distance
    # ========================================

    def calculate_distance(
        lat1,
        lon1,
        lat2,
        lon2
    ):

        R = 6371

        dlat = math.radians(
            lat2 - lat1
        )

        dlon = math.radians(
            lon2 - lon1
        )

        a = (
            math.sin(dlat / 2) ** 2
            +
            math.cos(math.radians(lat1))
            *
            math.cos(math.radians(lat2))
            *
            math.sin(dlon / 2) ** 2
        )

        c = 2 * math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a)
        )

        return R * c


    # ========================================
    # Create alerts
    # ========================================

    for user in nearby_users:

        receiver_id = user[0]

        receiver_lat = user[3]
        receiver_lng = user[4]


        if (
            receiver_lat is None
            or receiver_lng is None
        ):

            continue


        distance = calculate_distance(

            latitude,
            longitude,

            receiver_lat,
            receiver_lng

        )


        # 1 km radius

        if distance <= 1.0:


            alert_name = (
                sender_name
                if share_name
                else None
            )


            alert_phone = (
                sender_phone
                if share_phone
                else None
            )


            alert_latitude = (
                latitude
                if show_location
                else None
            )


            alert_longitude = (
                longitude
                if show_location
                else None
            )


            cursor.execute("""
                INSERT INTO nearby_emergency_alerts
                (
                    sender_id,
                    receiver_id,
                    latitude,
                    longitude,
                    message,
                    sender_name,
                    sender_phone
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (

                sender_id,

                receiver_id,

                alert_latitude
                    if alert_latitude is not None
                    else 0,

                alert_longitude
                    if alert_longitude is not None
                    else 0,

                "Emergency reported nearby",

                alert_name,

                alert_phone

            ))


    conn.commit()

    conn.close()


@app.route("/route")
def safe_route():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            incident_type,
            severity,
            description,
            latitude,
            longitude,
            status,
            created_at
        FROM incident_reports
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND status != 'Resolved'
    """)

    reports = cursor.fetchall()

    danger_locations = []

    for row in reports:

        danger_locations.append({

            "id": row["id"],

            "type": row["incident_type"],

            "severity": row["severity"],

            "description": row["description"],

            "latitude": row["latitude"],

            "longitude": row["longitude"],

            "status": row["status"],

            "date": row["created_at"]

        })

    conn.close()

    return render_template(
        "route.html",
        danger_locations=danger_locations
    )
    
@app.route("/nearby-danger-zones")
def nearby_danger_zones():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    user_id = session["user_id"]

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get user's latest location
    cursor.execute("""
        SELECT latitude, longitude
        FROM locations
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_id,))

    location = cursor.fetchone()

    if not location:
        conn.close()

        return jsonify({
            "success": True,
            "danger_zones": []
        })

    user_latitude = location["latitude"]
    user_longitude = location["longitude"]

    # Get reported incidents
    cursor.execute("""
        SELECT
            id,
            incident_type,
            severity,
            description,
            latitude,
            longitude,
            created_at
        FROM incident_reports
        WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        ORDER BY created_at DESC
    """)

    incidents = cursor.fetchall()

    conn.close()

    danger_zones = []

    for incident in incidents:

        distance = calculate_distance(
            user_latitude,
            user_longitude,
            incident["latitude"],
            incident["longitude"]
        )

        # 1 km danger-zone radius
        if distance <= 1.0:

            danger_zones.append({
                "id": incident["id"],
                "incident_type": incident["incident_type"],
                "severity": incident["severity"],
                "description": incident["description"],
                "latitude": incident["latitude"],
                "longitude": incident["longitude"],
                "distance": round(distance, 2),
                "created_at": incident["created_at"]
            })

    return jsonify({
        "success": True,
        "danger_zones": danger_zones
    })    

@app.route("/fake-call")
def fake_call():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            fake_call_ringtone,
            fake_call_vibration,
            fake_call_delay,
            caller_name
        FROM user_settings
        WHERE user_id = ?
    """, (session["user_id"],))

    row = cursor.fetchone()

    conn.close()

    # Default settings if no settings exist
    if not row:
        settings = {
            "caller_name": "Mom",
            "fake_call_ringtone": "notification",
            "fake_call_vibration": 1,
            "fake_call_delay": 5
        }
    else:
        settings = {
            "caller_name": row["caller_name"] or "Mom",
            "fake_call_ringtone": row["fake_call_ringtone"] or "notification",
            "fake_call_vibration": row["fake_call_vibration"] or 1,
            "fake_call_delay": row["fake_call_delay"] or 5
        }

    return render_template(
        "fake_call.html",
        settings=settings
    )

@app.route("/get-fake-call-settings")
def get_fake_call_settings():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            fake_call_ringtone,
            fake_call_vibration,
            fake_call_delay,
            caller_name
        FROM user_settings
        WHERE user_id = ?
    """, (session["user_id"],))

    settings = cursor.fetchone()

    conn.close()

    if not settings:
        return jsonify({
            "success": False,
            "message": "Fake call settings not found."
        }), 404

    return jsonify({
        "success": True,

        "ringtone":
            settings["fake_call_ringtone"],

        "vibration":
            settings["fake_call_vibration"],

        "delay":
            settings["fake_call_delay"],

        "caller_name":
            settings["caller_name"]
    })

@app.route("/emergency-recording")
def emergency_recording():

    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template("emergency_recording.html")

@app.route("/save-recording", methods=["POST"])
def save_recording():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401


    audio = request.files.get("audio")

    if not audio:
        return jsonify({
            "success": False,
            "message": "No audio file received."
        }), 400


    duration = request.form.get("duration", 0)

    try:
        duration = int(duration)
    except:
        duration = 0


    # ========================================
    # Recording folder
    # ========================================

    recording_folder = os.path.join(
        app.root_path,
        "static",
        "uploads",
        "recordings"
    )

    os.makedirs(
        recording_folder,
        exist_ok=True
    )


    # ========================================
    # Determine actual audio format
    # ========================================

    mime_type = audio.content_type or "audio/webm"

    print("Uploaded MIME type:", mime_type)


    if "mp4" in mime_type:

        extension = "mp4"

    elif "ogg" in mime_type:

        extension = "ogg"

    elif "wav" in mime_type:

        extension = "wav"

    else:

        extension = "webm"


    # ========================================
    # Unique filename
    # ========================================

    import uuid

    filename = (
        str(uuid.uuid4())
        + "."
        + extension
    )


    filepath = os.path.join(
        recording_folder,
        filename
    )


    # ========================================
    # Save audio
    # ========================================

    audio.save(filepath)


    # ========================================
    # Verify file was actually saved
    # ========================================

    if not os.path.exists(filepath):

        return jsonify({
            "success": False,
            "message": "Audio file could not be saved."
        }), 500


    file_size = os.path.getsize(filepath)

    print(
        "✅ Recording saved:",
        filename
    )

    print(
        "📦 File size:",
        file_size,
        "bytes"
    )


    if file_size == 0:

        return jsonify({
            "success": False,
            "message": "Recording file is empty."
        }), 500


    # ========================================
    # Save information in database
    # ========================================

    conn = sqlite3.connect(DATABASE)

    cursor = conn.cursor()


    cursor.execute("""
        INSERT INTO emergency_recordings
        (
            user_id,
            filename,
            duration
        )
        VALUES (?, ?, ?)
    """, (
        session["user_id"],
        filename,
        duration
    ))


    conn.commit()

    conn.close()

    # ========================================
    # Response
    # ========================================

    return jsonify({

        "success": True,

        "message":
            "Recording saved successfully.",

        "filename":
            filename

    })
    
@app.route("/recording-history")
def recording_history():

    if "user_id" not in session:
        return redirect(url_for("login"))


    conn = sqlite3.connect(DATABASE)

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            filename,
            duration,
            created_at
        FROM emergency_recordings
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (
        session["user_id"],
    ))

    recordings = cursor.fetchall()

    conn.close()


    return render_template(
        "recording_history.html",
        recordings=recordings
    )  
    
@app.route("/get-location-settings")
def get_location_settings():

    if "user_id" not in session:

        return jsonify({
            "success": False
        }), 401

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            location_sharing,
            live_location_updates,
            save_location_sos
        FROM user_settings
        WHERE user_id = ?
    """, (session["user_id"],))

    settings = cursor.fetchone()

    conn.close()

    if not settings:

        return jsonify({
            "success": False
        })

    return jsonify({
        "success": True,

        "location_sharing":
            settings["location_sharing"],

        "live_location_updates":
            settings["live_location_updates"],

        "save_location_sos":
            settings["save_location_sos"]
    })  
    
@app.route("/update-live-location", methods=["POST"])
def update_live_location():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No location data received."
        }), 400

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    try:
        latitude = float(latitude)
        longitude = float(longitude)

    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid location."
        }), 400

    user_id = session["user_id"]

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            location_sharing,
            live_location_updates,
            show_location_to_others
        FROM user_settings
        WHERE user_id = ?
    """, (user_id,))

    settings = cursor.fetchone()

    if not settings:
        conn.close()

        return jsonify({
            "success": False,
            "message": "Settings not found."
        })

    location_sharing = settings[0]
    live_location_updates = settings[1]
    show_location_to_others = settings[2]

    if location_sharing != 1:
        conn.close()

        return jsonify({
            "success": False,
            "message": "Location sharing is disabled."
        })

    if live_location_updates != 1:
        conn.close()

        return jsonify({
            "success": False,
            "message": "Live location updates are disabled."
        })

    # ========================================
    # INSERT OR UPDATE CURRENT LOCATION
    # ========================================

    cursor.execute("""
        INSERT INTO live_locations (
            user_id,
            latitude,
            longitude,
            updated_at
        )
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)

        ON CONFLICT(user_id)
        DO UPDATE SET
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            updated_at = CURRENT_TIMESTAMP
    """, (
        user_id,
        latitude,
        longitude
    ))

    conn.commit()
    conn.close()

    print(
        f"📍 LIVE LOCATION UPDATED: "
        f"User {user_id} → "
        f"{latitude}, {longitude}"
    )

    return jsonify({
        "success": True,
        "message": "Live location updated."
    })      
    
@app.route("/nearby-live-locations")
def nearby_live_locations():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    current_user_id = session["user_id"]

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            ll.user_id,
            ll.latitude,
            ll.longitude,
            ll.updated_at,
            u.fullname,
            u.phone
        FROM live_locations ll

        JOIN users u
            ON u.id = ll.user_id

        JOIN user_settings s
            ON s.user_id = ll.user_id

        WHERE ll.user_id != ?
        AND s.show_location_to_others = 1

        ORDER BY ll.updated_at DESC
    """, (current_user_id,))

    rows = cursor.fetchall()

    conn.close()

    locations = []

    for row in rows:

        locations.append({
            "user_id": row["user_id"],
            "name": row["fullname"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "updated_at": row["updated_at"]
        })

    return jsonify({
        "success": True,
        "locations": locations
    })    
    
@app.route("/nearby-emergency-alerts")
def nearby_emergency_alerts():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401


    conn = sqlite3.connect(DATABASE)

    cursor = conn.cursor()


    cursor.execute("""
        SELECT
            id,
            sender_name,
            sender_phone,
            latitude,
            longitude,
            message,
            created_at,
            is_read
        FROM nearby_emergency_alerts
        WHERE receiver_id=?
        AND is_read=0
        ORDER BY created_at DESC
    """, (
        session["user_id"],
    ))


    rows = cursor.fetchall()

    conn.close()


    alerts = []


    for row in rows:

        alerts.append({

            "id": row[0],

            "name": row[1],

            "phone": row[2],

            "latitude": row[3],

            "longitude": row[4],

            "message": row[5],

            "created_at": row[6],

            "is_read": row[7]

        })


    return jsonify({

        "success": True,

        "alerts": alerts

    })    
    
@app.route("/nearby-emergency-alerts-page")
def nearby_emergency_alerts_page():

    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template(
        "nearby_emergency_alerts.html"
    )    

@app.route("/mark-nearby-alerts-read", methods=["POST"])
def mark_nearby_alerts_read():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401


    conn = sqlite3.connect(DATABASE)

    cursor = conn.cursor()


    cursor.execute("""
        UPDATE nearby_emergency_alerts

        SET is_read = 1

        WHERE receiver_id = ?

        AND is_read = 0
    """, (
        session["user_id"],
    ))


    updated = cursor.rowcount


    conn.commit()
    conn.close()


    return jsonify({

        "success": True,

        "updated": updated

    })   

def calculate_distance(lat1, lon1, lat2, lon2):

    R = 6371

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    dlat = lat2 - lat1
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c    
    
def create_nearby_emergency_alert(sender_id, latitude, longitude):

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    try:

        # ========================================
        # GET SENDER INFORMATION
        # ========================================

        cursor.execute("""
            SELECT fullname, phone
            FROM users
            WHERE id = ?
        """, (sender_id,))

        sender = cursor.fetchone()

        if not sender:

            print(
                f"❌ Sender not found: {sender_id}"
            )

            return


        sender_name = sender[0]
        sender_phone = sender[1]


        # ========================================
        # GET SENDER PRIVACY SETTINGS
        # ========================================

        cursor.execute("""
            SELECT
                COALESCE(share_name_emergency, 0),
                COALESCE(share_phone_emergency, 0),
                COALESCE(show_location_to_others, 0)
            FROM user_settings
            WHERE user_id = ?
        """, (sender_id,))

        sender_settings = cursor.fetchone()


        if sender_settings:

            share_name = sender_settings[0]
            share_phone = sender_settings[1]
            show_location = sender_settings[2]

        else:

            share_name = 0
            share_phone = 0
            show_location = 0


        # ========================================
        # PRIVACY
        # ========================================

        if share_name == 1:

            alert_name = sender_name

        else:

            alert_name = "SafeHer User"


        if share_phone == 1:

            alert_phone = sender_phone

        else:

            alert_phone = "Hidden"


        # ========================================
        # GET ALL OTHER USERS
        # ========================================

        cursor.execute("""
            SELECT id
            FROM users
            WHERE id != ?
        """, (sender_id,))

        users = cursor.fetchall()


        alerts_created = 0


        # ========================================
        # CHECK EVERY USER
        # ========================================

        for user in users:

            receiver_id = user[0]


            # ====================================
            # RECEIVER SETTINGS
            # ====================================

            cursor.execute("""
                SELECT
                    COALESCE(nearby_user_alerts, 1)
                FROM user_settings
                WHERE user_id = ?
            """, (receiver_id,))

            receiver_setting = cursor.fetchone()


            if receiver_setting:

                nearby_user_alerts = receiver_setting[0]

            else:

                # Default ON
                nearby_user_alerts = 1


            # ====================================
            # ALERTS DISABLED
            # ====================================

            if nearby_user_alerts != 1:

                print(
                    f"ℹ️ User {receiver_id} "
                    f"disabled Nearby User Alerts."
                )

                continue


            # ====================================
            # GET RECEIVER LIVE LOCATION
            # ====================================

            receiver_location = None

            try:

                cursor.execute("""
                    SELECT
                        latitude,
                        longitude
                    FROM live_location_updates
                    WHERE user_id = ?
                    ORDER BY updated_at DESC
                    LIMIT 1
                """, (receiver_id,))

                receiver_location = cursor.fetchone()

            except sqlite3.OperationalError:

                # Table/column may not exist.
                # Fall back to saved locations.
                receiver_location = None


            # ====================================
            # FALLBACK TO LOCATIONS TABLE
            # ====================================

            if not receiver_location:

                cursor.execute("""
                    SELECT
                        latitude,
                        longitude
                    FROM locations
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (receiver_id,))

                receiver_location = cursor.fetchone()


            # ====================================
            # NO LOCATION
            # ====================================

            if not receiver_location:

                print(
                    f"⚠️ No location found "
                    f"for user {receiver_id}"
                )

                continue


            receiver_latitude = \
                receiver_location[0]

            receiver_longitude = \
                receiver_location[1]


            # ====================================
            # CALCULATE DISTANCE
            # ====================================

            distance = calculate_distance(

                latitude,
                longitude,

                receiver_latitude,
                receiver_longitude

            )


            print(
                f"📍 User {receiver_id}: "
                f"{distance:.3f} km away"
            )


            # ====================================
            # 1 KM RADIUS
            # ====================================

            if distance <= 1.0:


                # ====================================
                # LOCATION SHARING
                # ====================================

                if show_location == 1:

                    alert_latitude = latitude
                    alert_longitude = longitude

                else:

                    alert_latitude = None
                    alert_longitude = None


                # ====================================
                # CREATE ALERT
                # ====================================

                cursor.execute("""
                    INSERT INTO nearby_emergency_alerts
                    (
                        sender_id,
                        receiver_id,
                        latitude,
                        longitude,
                        message,
                        sender_name,
                        sender_phone,
                        is_read
                    )

                    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                """, (

                    sender_id,

                    receiver_id,

                    alert_latitude,

                    alert_longitude,

                    "Emergency reported nearby",

                    alert_name,

                    alert_phone

                ))


                alerts_created += 1


                print(
                    f"🚨 Alert created "
                    f"for user {receiver_id}"
                )


        # ========================================
        # COMMIT
        # ========================================

        conn.commit()


        print(
            f"🚨 Nearby alerts created: "
            f"{alerts_created}"
        )


    except Exception as e:

        conn.rollback()

        print(
            "❌ Nearby emergency alert error:",
            e
        )


    finally:

        conn.close()
    
def send_emergency_email(user_id, latitude, longitude):

    # ========================================
    # CHECK BREVO CONFIGURATION
    # ========================================

    if not BREVO_API_KEY:
        print("❌ BREVO_API_KEY is missing.")
        return

    if not BREVO_SENDER_EMAIL:
        print("❌ BREVO_SENDER_EMAIL is missing.")
        return


    # ========================================
    # DATABASE
    # ========================================

    conn = sqlite3.connect(DATABASE)

    cursor = conn.cursor()


    # ========================================
    # GET USER INFORMATION
    # ========================================

    cursor.execute("""
        SELECT fullname, phone
        FROM users
        WHERE id = ?
    """, (user_id,))

    user = cursor.fetchone()


    if not user:

        conn.close()

        print("❌ User not found.")

        return


    sender_name = user[0]
    sender_phone = user[1]


    # ========================================
    # GET EMERGENCY CONTACTS
    # ========================================

    cursor.execute("""
        SELECT fullname, email
        FROM emergency_contacts
        WHERE user_id = ?
        AND email IS NOT NULL
        AND email != ''
    """, (user_id,))


    contacts = cursor.fetchall()

    conn.close()


    if not contacts:

        print(
            "📧 No emergency contacts with email found."
        )

        return


    # ========================================
    # LOCATION LINK
    # ========================================

    location_url = (
        "https://www.openstreetmap.org/"
        f"?mlat={latitude}"
        f"&mlon={longitude}"
    )


    # ========================================
    # BREVO API
    # ========================================

    url = "https://api.brevo.com/v3/smtp/email"


    headers = {

        "accept": "application/json",

        "api-key": BREVO_API_KEY,

        "content-type": "application/json"

    }


    # ========================================
    # SEND EMAIL TO EACH CONTACT
    # ========================================

    for contact in contacts:

        contact_name = contact[0]
        contact_email = contact[1]


        payload = {

            "sender": {

                "name":
                    BREVO_SENDER_NAME,

                "email":
                    BREVO_SENDER_EMAIL

            },

            "to": [

                {

                    "email":
                        contact_email,

                    "name":
                        contact_name

                }

            ],

            "subject":
                "🚨 SafeHer Emergency Alert",

            "htmlContent": (
    f"<html>"
    f"<body>"
    f"<h2>🚨 SafeHer Emergency Alert</h2>"

    f"<p>Hello {contact_name},</p>"

    f"<p>"
    f"<strong>{sender_name}</strong> "
    f"has triggered an emergency SOS."
    f"</p>"

    f"<p>"
    f"<strong>Name:</strong> {sender_name}<br>"
    f"<strong>Phone:</strong> {sender_phone}"
    f"</p>"

    f"<p>"
    f"<strong>Latitude:</strong> {latitude}<br>"
    f"<strong>Longitude:</strong> {longitude}"
    f"</p>"

    f"<p>"
    f'<a href="{location_url}">'
    f"📍 View Emergency Location"
    f"</a>"
    f"</p>"

    f"<p>"
    f"Please respond immediately if assistance is required."
    f"</p>"

    f"<p>"
    f"This message was automatically sent by SafeHer."
    f"</p>"

    f"</body>"
    f"</html>"
            ),
        }


        try:

            response = requests.post(

                url,

                headers=headers,

                json=payload,

                timeout=20

            )


            print(
                "📧 Brevo status:",
                response.status_code
            )


            print(
                "📧 Brevo response:",
                response.text
            )


            if response.ok:

                print(
                    "✅ Emergency email sent to:",
                    contact_email
                )

            else:

                print(
                    "❌ Brevo email failed:",
                    contact_email
                )


        except Exception as e:

            print(
                "❌ Brevo email error:",
                e
            )
            
def send_emergency_sms(user_id, latitude, longitude):

    # ========================================
    # CHECK TEXTBEE CONFIGURATION
    # ========================================

    if not TEXTBEE_API_KEY:

        print(
            "❌ TEXTBEE_API_KEY is missing."
        )

        return


    if not TEXTBEE_DEVICE_ID:

        print(
            "❌ TEXTBEE_DEVICE_ID is missing."
        )

        return


    # ========================================
    # DATABASE
    # ========================================

    conn = sqlite3.connect(DATABASE)

    cursor = conn.cursor()


    # ========================================
    # GET USER INFORMATION
    # ========================================

    cursor.execute("""
        SELECT fullname, phone
        FROM users
        WHERE id = ?
    """, (user_id,))

    user = cursor.fetchone()


    if not user:

        conn.close()

        print(
            "❌ User not found."
        )

        return


    sender_name = user[0]
    sender_phone = user[1]


    # ========================================
    # GET EMERGENCY CONTACTS
    # ========================================

    cursor.execute("""
        SELECT fullname, phone
        FROM emergency_contacts
        WHERE user_id = ?
        AND phone IS NOT NULL
        AND phone != ''
    """, (user_id,))

    contacts = cursor.fetchall()

    conn.close()


    if not contacts:

        print(
            "📱 No emergency contacts with phone numbers found."
        )

        return


    # ========================================
    # LOCATION
    # ========================================

    location_url = (
        "https://www.openstreetmap.org/"
        f"?mlat={latitude}"
        f"&mlon={longitude}"
    )


    # ========================================
    # TEXTBEE API
    # ========================================

    url = (
        "https://api.textbee.dev/"
        "api/v1/gateway/send-bulk-sms"
    )


    headers = {

        "x-api-key":
            TEXTBEE_API_KEY,

        "Content-Type":
            "application/json"

    }


    # ========================================
    # CREATE SMS MESSAGES
    # ========================================

    messages = []


    for contact in contacts:

        contact_name = contact[0]
        contact_phone = contact[1]


        message_body = f"""🚨 SAFEHER EMERGENCY ALERT

Hello {contact_name},

{sender_name} has triggered an emergency SOS.

Phone:
{sender_phone}

Location:
{location_url}

Please respond immediately if assistance is required.

This message was automatically sent by SafeHer.
"""


        messages.append({

            "recipients": [
                contact_phone
            ],

            "message":
                message_body

        })


    # ========================================
    # TEXTBEE PAYLOAD
    # ========================================

    payload = {

        "deviceId":
            TEXTBEE_DEVICE_ID,

        "messages":
            messages

    }


    # ========================================
    # SEND SMS
    # ========================================

    try:

        response = requests.post(

            url,

            headers=headers,

            json=payload,

            timeout=20

        )


        print(
            "📱 TextBee status:",
            response.status_code
        )


        print(
            "📱 TextBee response:",
            response.text
        )


        if response.ok:

            print(
                "✅ Emergency SMS request sent."
            )

        else:

            print(
                "❌ TextBee SMS request failed."
            )


    except Exception as e:

        print(
            "❌ TextBee connection error:",
            e
        )               
    
@app.route("/sos", methods=["POST"])
def sos():

    # ========================================
    # LOGIN CHECK
    # ========================================

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401


    # ========================================
    # GET REQUEST DATA
    # ========================================

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "message": "No location data received."
        }), 400


    latitude = data.get("latitude")
    longitude = data.get("longitude")


    if latitude is None or longitude is None:

        return jsonify({
            "success": False,
            "message": "Location is required."
        }), 400


    # ========================================
    # VALIDATE LOCATION
    # ========================================

    try:

        latitude = float(latitude)
        longitude = float(longitude)

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": "Invalid location."
        }), 400


    user_id = session["user_id"]


    # ========================================
    # GET USER SETTINGS
    # ========================================

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            save_location_sos,
            emergency_alerts,
            nearby_user_alerts
        FROM user_settings
        WHERE user_id = ?
    """, (user_id,))

    settings = cursor.fetchone()

    conn.close()


    # ========================================
    # DEFAULT SETTINGS
    # ========================================

    if settings is None:

        save_location_sos = 1
        emergency_alerts = 1
        nearby_user_alerts = 1

    else:

        save_location_sos = settings["save_location_sos"]
        emergency_alerts = settings["emergency_alerts"]
        nearby_user_alerts = settings["nearby_user_alerts"]


    # ========================================
    # SAVE SOS LOCATION
    # ========================================

    if save_location_sos == 1:

        conn = sqlite3.connect(DATABASE)

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO locations
            (
                user_id,
                latitude,
                longitude,
                event_type
            )
            VALUES (?, ?, ?, ?)
        """, (

            user_id,
            latitude,
            longitude,
            "SOS"

        ))

        conn.commit()
        conn.close()

        print(
            "🚨 SOS LOCATION SAVED:",
            latitude,
            longitude
        )

    else:

        print(
            "ℹ️ SOS location saving disabled."
        )


    # ========================================
    # NEARBY USER EMERGENCY ALERT
    # ========================================

    if nearby_user_alerts == 1:

        create_nearby_emergency_alert(
            user_id,
            latitude,
            longitude
        )

    else:

        print(
            "ℹ️ Nearby user alerts disabled."
        )


    # ========================================
    # EMAIL EMERGENCY NOTIFICATION
    # ========================================

    # ========================================
# EMERGENCY EMAIL + SMS
# ========================================

    if emergency_alerts == 1:

    # ----------------------------------------
    # EMAIL
    # ----------------------------------------

        try:

            send_emergency_email(
                user_id,
                latitude,
                longitude
            )

            print(
                "📧 Emergency email notification sent."
            )

        except Exception as e:

            print(
            "❌ Email notification error:",
            e
            )   


    # ----------------------------------------
    # SMS
    # ----------------------------------------

        try:

            send_emergency_sms(
                user_id,
                latitude,
                longitude
            )

            print(
            "📱 Emergency SMS notification sent."
            )

        except Exception as e:

            print(
            "❌ SMS notification error:",
            e
            )

    else:

        print(
            "ℹ️ Emergency notifications disabled."
        )

    # ========================================
    # SUCCESS
    # ========================================

    return jsonify({

        "success": True,

        "message":
            "Emergency SOS sent successfully."

    })    

@app.route("/get-app-preferences")
def get_app_preferences():

    if "user_id" not in session:

        return jsonify({
            "success": False
        }), 401

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            language,
            sound_effects
        FROM user_settings
        WHERE user_id = ?
    """, (session["user_id"],))

    settings = cursor.fetchone()

    conn.close()

    if not settings:

        return jsonify({
            "success": False
        })

    return jsonify({

        "success": True,

        "language":
            settings["language"],

        "sound_effects":
            settings["sound_effects"]

    })
    
@app.route("/set-language", methods=["POST"])
def set_language():

    if "user_id" not in session:

        return jsonify({
            "success": False
        }), 401

    data = request.get_json()

    language = data.get("language")

    if language not in ["English", "বাংলা"]:

        return jsonify({
            "success": False,
            "message": "Invalid language."
        }), 400

    session["language"] = language

    conn = sqlite3.connect(DATABASE)

    cursor = conn.cursor()

    cursor.execute("""
        UPDATE user_settings
        SET language = ?
        WHERE user_id = ?
    """, (
        language,
        session["user_id"]
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "language": language
    })    
    
@app.context_processor
def inject_language():

    language = "English"

    if "user_id" in session:

        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row

        cursor = conn.cursor()

        cursor.execute("""
            SELECT language
            FROM user_settings
            WHERE user_id = ?
        """, (session["user_id"],))

        settings = cursor.fetchone()

        conn.close()

        if settings and settings["language"]:
            language = settings["language"]

    return {
        "language": language
    }    

@app.route("/admin")
def admin_dashboard():

    # ==========================================
    # ADMIN AUTHENTICATION
    # ==========================================

    if not session.get("admin"):
        return redirect(url_for("login"))


    # ==========================================
    # DATABASE CONNECTION
    # ==========================================

    conn = sqlite3.connect(DATABASE)

    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()


    # ==========================================
    # STATISTICS
    # ==========================================

    # Total Users
    cursor.execute("""
        SELECT COUNT(*)
        FROM users
    """)

    total_users = cursor.fetchone()[0]


    # Total Emergency Contacts
    cursor.execute("""
        SELECT COUNT(*)
        FROM emergency_contacts
    """)

    total_contacts = cursor.fetchone()[0]


    # Total Saved Locations
    cursor.execute("""
        SELECT COUNT(*)
        FROM locations
    """)

    total_locations = cursor.fetchone()[0]


    # Total SOS Alerts
    cursor.execute("""
        SELECT COUNT(*)
        FROM locations
        WHERE event_type = 'Shared'
    """)

    total_sos = cursor.fetchone()[0]


    # ==========================================
    # INCIDENT STATISTICS
    # ==========================================

    # Total Incidents
    cursor.execute("""
        SELECT COUNT(*)
        FROM incident_reports
    """)

    total_incidents = cursor.fetchone()[0]


    # Pending Incidents
    cursor.execute("""
        SELECT COUNT(*)
        FROM incident_reports
        WHERE status = 'Pending'
    """)

    pending_incidents = cursor.fetchone()[0]


    # Resolved Incidents
    cursor.execute("""
        SELECT COUNT(*)
        FROM incident_reports
        WHERE status = 'Resolved'
    """)

    resolved_incidents = cursor.fetchone()[0]


    # ==========================================
    # RECENT INCIDENTS
    # ==========================================

    cursor.execute("""
        SELECT

            incident_reports.id,

            incident_reports.incident_type,

            incident_reports.severity,

            incident_reports.status,

            incident_reports.created_at,

            COALESCE(
                users.fullname,
                'Deleted User'
            ) AS fullname

        FROM incident_reports

        LEFT JOIN users
            ON incident_reports.user_id = users.id

        ORDER BY incident_reports.created_at DESC

        LIMIT 10
    """)

    recent_incidents = cursor.fetchall()


    # ==========================================
    # RECENT USERS
    # ==========================================

    cursor.execute("""
        SELECT

            id,

            fullname,

            email,

            phone


        FROM users

        ORDER BY id DESC

        LIMIT 10
    """)

    recent_users = cursor.fetchall()


    # ==========================================
    # RECENT EMERGENCY CONTACTS
    # ==========================================

    cursor.execute("""
        SELECT

            users.fullname AS owner_name,

            emergency_contacts.fullname AS contact_name,

            emergency_contacts.phone,

            emergency_contacts.relationship

        FROM emergency_contacts

        JOIN users

            ON users.id = emergency_contacts.user_id

        ORDER BY emergency_contacts.id DESC

        LIMIT 5
    """)

    recent_contacts = cursor.fetchall()


    # ==========================================
    # RECENT LOCATIONS
    # ==========================================

    cursor.execute("""
        SELECT

            locations.id,

            locations.event_type,

            locations.created_at,

            COALESCE(
                users.fullname,
                'Deleted User'
            ) AS fullname

        FROM locations

        LEFT JOIN users

            ON locations.user_id = users.id

        ORDER BY locations.created_at DESC

        LIMIT 10
    """)

    recent_locations = cursor.fetchall()


    # ==========================================
    # RECENT ACTIVITY
    # ==========================================

    recent_activity = []


    # ------------------------------------------
    # Incident Activity
    # ------------------------------------------

    for incident in recent_incidents:

        recent_activity.append({

            "activity_id":
                incident["id"],

            "activity_type":
                "incident",

            "title":
                incident["incident_type"],

            "severity":
                incident["severity"],

            "status":
                incident["status"],

            "created_at":
                incident["created_at"],

            "fullname":
                incident["fullname"]

        })


    # ------------------------------------------
    # New User Activity
    # ------------------------------------------

    for user in recent_users:

        recent_activity.append({

            "activity_id":
                user["id"],

            "activity_type":
                "user",

            "title":
                "New User Registered",

            "severity":
                None,

            "status":
                "New",

            "created_at":
                "",

            "fullname":
                user["fullname"]

        })


    # ------------------------------------------
    # Location / SOS Activity
    # ------------------------------------------

    for location in recent_locations:

        # SOS / Shared Location
        if location["event_type"] == "Shared":

            recent_activity.append({

                "activity_id":
                    location["id"],

                "activity_type":
                    "sos",

                "title":
                    "SOS Alert",

                "severity":
                    None,

                "status":
                    "SOS",

                "created_at":
                    location["created_at"],

                "fullname":
                    location["fullname"]

            })


        # Normal Saved Location
        else:

            recent_activity.append({

                "activity_id":
                    location["id"],

                "activity_type":
                    "location",

                "title":
                    "Location Saved",

                "severity":
                    None,

                "status":
                    "Location",

                "created_at":
                    location["created_at"],

                "fullname":
                    location["fullname"]

            })


    # ==========================================
    # SORT RECENT ACTIVITY
    # ==========================================

    recent_activity.sort(

        key=lambda x:
            x["created_at"] or "",

        reverse=True

    )


    # Only show latest 10 activities

    recent_activity = recent_activity[:10]


    # ==========================================
    # CLOSE DATABASE
    # ==========================================

    conn.close()


    # ==========================================
    # RENDER ADMIN DASHBOARD
    # ==========================================

    return render_template(

        "admin_dashboard.html",

        # Statistics
        total_users=total_users,

        total_contacts=total_contacts,

        saved_locations=total_locations,

        sos=total_sos,


        # Incident Statistics
        total_incidents=total_incidents,

        pending_incidents=pending_incidents,

        resolved_incidents=resolved_incidents,


        # Recent Data
        recent_incidents=recent_incidents,

        recent_users=recent_users,

        recent_contacts=recent_contacts,

        recent_locations=recent_locations,


        # Unified Activity
        recent_activity=recent_activity

    )
@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("login"))    
     
@app.route("/logout")
def logout():

    session.clear()

    return redirect(url_for("login"))    

if __name__ == "__main__":
    app.run(debug=True)
