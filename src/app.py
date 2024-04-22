from flask import Flask, request, jsonify
import requests
import logging
import os
import toml

def load_config():
    """Load and return configuration from a TOML file specified by an environment variable."""
    config_path = os.getenv('CONFIG_PATH', 'config.toml')
    try:
        return toml.load(config_path)
    except Exception as e:
        logging.error(f"Failed to load config from {config_path}: {e}")
        exit(1)  

app = Flask(__name__)


config = load_config()

# Setup Telegram bot configuration
BOT_API_KEY = config.get('telegram', {}).get('bot_api_key')
status_chat_id = config.get('telegram', {}).get('status_chat_id')
alert_chat_id = config.get('telegram', {}).get('alert_chat_id')

if not all([BOT_API_KEY, status_chat_id, alert_chat_id]):
    logging.error("Missing required telegram configurations")
    exit(1)  # Exit if critical configuration is missing.

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

def alert(msg: str, alert=False):
    """Send a message to a specific Telegram chat based on alert type."""
    chat_id = alert_chat_id if alert else status_chat_id
    params = {
        'chat_id': chat_id,
        'text': msg,
    }
    try:
        response = requests.get(f"https://api.telegram.org/bot{BOT_API_KEY}/sendMessage", params=params)
        response.raise_for_status()
        logger.info("Message sent successfully!")
        logger.debug(response.text)
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send message: {e}")

@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle incoming webhook notifications."""
    if not request.json:
        return jsonify({'status': 'error', 'message': 'Request must be JSON'}), 400

    data = request.json
    event_type = data.get('type')

    if event_type == 'new_proposal':
        proposal_id = data.get('proposal_id', 'N/A')
        message = f"New proposal submitted! ID: {proposal_id}"
        alert(message, alert=False)
        return jsonify({'status': 'success', 'message': 'Notification sent'}), 200
    else:
        return jsonify({'status': 'ignored', 'message': 'Irrelevant event type'}), 200

@app.route('/ping', methods=['GET'])
def ping():
    """Respond to ping requests to verify service availability."""
    alert("Ping received!", alert=False)
    return jsonify({'status': 'success', 'message': 'pong'}), 200

if __name__ == '__main__':
    app.run(debug=config.get('server', {}).get('debug', False), port=config.get('server', {}).get('port', 5000))
