const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const CLIENT_ID = '293248084081-tj6qmn37qr1gkema8jdkpneek6tjq37f.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback'; // For web applications, this should be a valid callback URL

const oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Generate the URL to get user consent
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'], // Scope for reading Gmail
});

module.exports = { oauth2Client, authUrl };
