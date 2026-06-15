# BigQuery Release Notes Explorer

A premium, modern web application for tracking, searching, filtering, and sharing the official Google Cloud BigQuery release notes feed. 

The application consists of a **Python Flask** backend that fetches and parses the official XML Atom feed, and a highly responsive, vanilla **HTML/CSS/JS** frontend designed with rich modern aesthetics (glassmorphism, glowing ambient backgrounds, custom animations, and responsive grids).

---

## Key Features

- **Sub-Item Entry Separation**: Google Cloud groups a single day's updates into a combined HTML block. The backend dynamically parses and splits this content by `<h3>` tags to treat each update as its own unique card.
- **Interactive Metrics Dashboard**: Tracks and updates live counts of release notes categorized by category types (Feature, Change, Deprecation, Fix). Stats cards double as quick-filter tabs.
- **Search & Sort**: Instant client-side full-text search across date, type, and content, combined with dynamic chronological sorting (Newest/Oldest).
- **Tweet Composer Modal**: A custom, X/Twitter-inspired post editor showing a real-time character limit progress ring. Automates draft creation by truncating release notes to fit within 280 characters alongside hashtags and document URLs.
- **Caching Mechanism**: Features an in-memory server cache (5 minutes) to respect Google Cloud's servers and avoid feed rate-limiting, while supporting manual force-refreshes.

---

## Directory Structure

```text
bigquery-release-notes-viewer/
│
├── app.py                 # Core Flask application, caching, and XML parsing logic
├── .gitignore             # Git exclusion rules (venv, cache, IDE configurations)
├── README.md              # Project documentation
│
├── templates/
│   └── index.html         # HTML5 layout grid and modals
│
└── static/
    ├── css/
    │   └── style.css      # Core styles, glassmorphic variables, animations, and badges
    └── js/
        └── app.js         # State management, search logic, and Twitter integration
```

---

## Setup & Running Locally

### Prerequisites
- Python 3.x
- pip (Python package installer)

### 1. Clone & Navigate
```bash
cd bigquery-release-notes-viewer/
```

### 2. Install Dependencies
Install Flask (the only package dependency):
```bash
pip3 install flask
```

### 3. Run the Development Server
```bash
python3 app.py
```
By default, the server runs on port **`5001`** to avoid typical development port conflicts.

### 4. Access the Application
Open your browser and navigate to:
👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## Git Operations

This project is configured with Git, pointing to your GitHub repository:
`git@github.com:preran-kurnool/antigravity-event-talks-app.git`

If you make modifications locally and want to push changes:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```
