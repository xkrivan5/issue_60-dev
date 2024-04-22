import unittest
from src.app import create_app
from unittest.mock import patch

class FlaskTestCase(unittest.TestCase):

    def setUp(self):
        """Set up test client and propagate exceptions."""
        self.app = create_app()
        self.client = self.app.test_client()
        self.app.config['TESTING'] = True

    @patch('src.app.send_telegram_message')
    def test_webhook(self, mock_send_telegram_message):
        """Test the /webhook route."""
        response = self.client.post('/webhook', json={'type': 'new_proposal', 'proposal_id': '123'})
        mock_send_telegram_message.assert_called_once_with('New proposal submitted! ID: 123')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {'status': 'success', 'message': 'Notification sent'})

    def test_webhook_bad_request(self):
        """Test the /webhook route with invalid data."""
        response = self.client.post('/webhook', data='{"type": "new_proposal"}', content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
