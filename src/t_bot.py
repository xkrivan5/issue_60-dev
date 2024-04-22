import requests
import logging

# Configuration: Set your Telegram bot's API key and chat IDs for regular updates and alerts
BOT_API_KEY = '6573985589:AAGmwo5CHAuuD0RbopkWIf42_U3mLzKn5RY'
status_chat_id = '-1002033317084'  # Example chat ID for regular updates
alert_chat_id = '-1002033317085'  # Example chat ID for alerts

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

def alert(msg: str, alert=False):
    """
    Send a message to a specific Telegram chat based on alert type.

    :param msg: Message text to send.
    :param alert: Boolean, if True, send to the alert chat; otherwise, send to the status chat.
    """
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

if __name__ == '__main__':
    # Example usage:
    alert("This is a regular update.")
