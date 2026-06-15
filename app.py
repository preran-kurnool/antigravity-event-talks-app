from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import html
import time
from datetime import datetime

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to avoid rate limiting
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECONDS = 300 # 5 minutes

def clean_html(raw_html):
    # Remove code blocks or handle them nicely
    # Replace links with text (e.g. "Gemini Cloud Assist (https://...)" or just keep the text)
    # Let's keep it simple: strip tags, keep text.
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    # Normalize whitespaces
    cleantext = re.sub(r'\s+', ' ', cleantext)
    return html.unescape(cleantext).strip()

def parse_release_notes(xml_data):
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    parsed_items = []
    
    item_id_counter = 0
    for entry in entries:
        title = entry.find('atom:title', ns).text  # Usually the date, e.g., "June 12, 2026"
        updated_str = entry.find('atom:updated', ns).text
        link_elem = entry.find('atom:link', ns)
        base_link = link_elem.attrib.get('href') if link_elem is not None else "https://docs.cloud.google.com/bigquery/docs/release-notes"
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Format date for sorting/display
        # updated_str is typically ISO 8601 like "2026-06-12T00:00:00-07:00"
        date_obj = None
        try:
            # Parse prefix "YYYY-MM-DD"
            date_part = updated_str.split('T')[0]
            date_obj = datetime.strptime(date_part, "%Y-%m-%d")
            formatted_date = date_obj.strftime("%b %d, %Y")
        except Exception:
            formatted_date = title
            
        # Split daily content by <h3> tags
        parts = re.split(r'(?i)<h3>(.*?)</h3>', content_html)
        
        if len(parts) <= 1:
            # If no <h3> header is found, treat the whole block as one entry
            item_id_counter += 1
            clean_text = clean_html(content_html)
            parsed_items.append({
                "id": f"item_{item_id_counter}",
                "date": formatted_date,
                "raw_date": date_part if date_obj else updated_str,
                "type": "General",
                "html_content": content_html,
                "text_content": clean_text,
                "link": base_link
            })
        else:
            # Alternating parts: [0] = preamble, [1] = header1, [2] = content1, etc.
            i = 1
            while i < len(parts):
                note_type = parts[i].strip()
                note_content = parts[i+1].strip() if i+1 < len(parts) else ""
                
                item_id_counter += 1
                clean_text = clean_html(note_content)
                
                # Create a specific anchor link if possible
                anchor = note_type.lower() + "_" + formatted_date.replace(" ", "_").replace(",", "")
                item_link = f"{base_link}#{anchor}"
                
                parsed_items.append({
                    "id": f"item_{item_id_counter}",
                    "date": formatted_date,
                    "raw_date": date_part if date_obj else updated_str,
                    "type": note_type,
                    "html_content": note_content,
                    "text_content": clean_text,
                    "link": base_link # Keep base link as external reference
                })
                i += 2
                
    # Sort items by raw_date desc, and then by id desc (to preserve original order in the XML)
    parsed_items.sort(key=lambda x: (x.get("raw_date", ""), x.get("id", "")), reverse=True)
    return parsed_items

def fetch_feed(force_refresh=False):
    now = time.time()
    if not force_refresh and cache["data"] is not None and (now - cache["last_fetched"] < CACHE_DURATION_SECONDS):
        return cache["data"], "cache"
        
    try:
        req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'BigQuery-Release-Notes-Viewer/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        parsed = parse_release_notes(xml_data)
        cache["data"] = parsed
        cache["last_fetched"] = now
        return parsed, "fresh"
    except Exception as e:
        print("Error fetching feed:", e)
        # If fetch fails but we have cached data, return cached data
        if cache["data"] is not None:
            return cache["data"], "error_fallback"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes, source = fetch_feed(force_refresh=force)
        return jsonify({
            "success": True,
            "source": source,
            "last_updated": datetime.fromtimestamp(cache["last_fetched"]).strftime("%Y-%m-%d %H:%M:%S") if cache["last_fetched"] > 0 else "Never",
            "notes": notes
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Running on port 5001 to avoid conflicts
    app.run(host='0.0.0.0', port=5001, debug=True)
