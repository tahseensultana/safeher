# SafeHer 🛡️

**SafeHer** is a women’s safety web application designed to provide quick access to emergency assistance, location-based safety features, incident reporting, and emergency notifications.

The project focuses on helping users respond quickly during dangerous situations while providing configurable privacy and safety controls.

## 🚨 Features

### 🆘 Emergency SOS

* Hold the SOS button for **4 seconds** to trigger an emergency alert.
* Automatically uses the user's current location.
* Saves the SOS location when the corresponding setting is enabled.
* Sends emergency notifications to registered emergency contacts.
* Creates nearby emergency alerts for other SafeHer users when enabled.

### 📍 Location & Safety

* Live location tracking.
* Location sharing controls.
* Save location during SOS.
* Nearby emergency alerts.
* OpenStreetMap integration for viewing reported locations.
* Location history for previously saved locations.
* Configurable location privacy settings.

### 👥 Nearby Emergency Alerts

When a user triggers an SOS:

* SafeHer checks for nearby users.
* Users within the configured emergency radius can receive an emergency alert.
* The alert can display the sender's name and phone number according to the sender's privacy settings.
* Users can open the reported location using OpenStreetMap.

### 📧 Email & 📱 SMS Notifications

SafeHer supports emergency notifications through:

* Email notifications to emergency contacts.
* SMS notifications through Twilio.
* Incident report status notifications.

Emergency notifications can be controlled through the user's notification settings.

### 📋 Incident Reporting

Users can report incidents with:

* Incident type
* Severity
* Description
* Location
* Optional evidence/image
* Anonymous reporting

Administrators can update incident status:

* Pending
* Reviewing
* Resolved
* Rejected

Users can receive an email notification when their report status changes if **Incident Report Updates** is enabled.

### ⚙️ User Settings

SafeHer provides configurable settings for:

**Notifications**

* Emergency Alerts
* Danger Zone Alerts
* Nearby User Alerts
* Incident Report Updates
* Location Sharing Alerts
* Sound
* Vibration

**Location & Safety**

* Location Sharing
* Danger Zone Detection
* Live Location Updates
* Save Location During SOS

**Fake Call**

* Ringtone
* Vibration
* Delay
* Caller Name

**Privacy**

* Anonymous Incident Reports
* Show My Location to Others
* Share Name During Emergency
* Share Phone Number During Emergency
* Location History

**App Preferences**

* Language
* Sound Effects

### 📞 Fake Call

The fake-call feature can simulate an incoming phone call to help users create an opportunity to leave an uncomfortable or unsafe situation.

Users can configure:

* Caller name
* Call delay
* Ringtone
* Vibration

## 🛠️ Technology Stack

### Backend

* Python
* Flask
* SQLite

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5
* Bootstrap Icons

### APIs & Services

* OpenStreetMap
* Twilio SMS
* SMTP / Flask-Mail for email notifications
* Browser Geolocation API

## 📂 Project Structure

```text
SafeHer/
│
├── app.py
├── init_db.py
├── database.db
├── .env
├── .gitignore
│
├── templates/
│   ├── dashboard.html
│   ├── settings.html
│   ├── report_incident.html
│   ├── fake_call.html
│   └── ...
│
├── static/
│   ├── css/
│   ├── js/
│   └── uploads/
│
└── README.md
```

> `.env`, virtual environments, and local database files should not be committed to GitHub.

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd SafeHer
```

### 2. Create a virtual environment

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

If you don't have a `requirements.txt` yet, create one with:

```bash
pip freeze > requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root.

Example:

```env
SECRET_KEY=your-secret-key

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-email-app-password

TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

**Never upload `.env` to GitHub.**

Your `.gitignore` should contain:

```text
.env
.venv/
venv/
__pycache__/
*.pyc
database.db
```

## 🗄️ Database Setup

Initialize the database using:

```bash
python init_db.py
```

The application uses SQLite for development.

Important tables include:

* `users`
* `emergency_contacts`
* `locations`
* `user_settings`
* `nearby_emergency_alerts`
* `incident_reports`

## ▶️ Running the Application

Activate your virtual environment and run:

```bash
flask run
```

Or:

```bash
python app.py
```

The application will normally be available at:

```text
http://127.0.0.1:5000
```

## 🔐 Privacy & Security

SafeHer contains sensitive information such as:

* User information
* Phone numbers
* Emergency contacts
* Location information
* Email credentials
* Twilio credentials

For this reason:

* Never commit `.env`.
* Never expose API credentials in frontend JavaScript.
* Never publish database credentials.
* Use environment variables for secrets.
* Validate user input on the server.
* Require authentication for protected routes.

## 🚀 Future Improvements

Possible future enhancements include:

* Real-time WebSocket emergency alerts
* Push notifications
* Improved danger-zone detection
* Emergency service integration
* More advanced location-sharing controls
* Mobile application
* Improved administrator dashboard
* SMS delivery status tracking
* Automated emergency escalation
* Stronger authentication and account security

## 👨‍💻 Project Status

SafeHer is an actively developed safety-focused web application.

Current implementation includes:

* User authentication
* Emergency SOS
* 4-second SOS hold
* Live location
* Location history
* Nearby emergency alerts
* Emergency contacts
* Email notifications
* SMS integration
* Incident reporting
* Admin incident management
* User settings
* Fake call
* Privacy controls

## 📄 License

This project is developed for educational and project purposes.

---

**SafeHer — Safety when you need it most. 🛡️**
