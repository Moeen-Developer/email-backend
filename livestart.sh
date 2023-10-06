export MONGODB_URL="mongodb+srv://admin:admin@cluster0.s7abq5t.mongodb.net/?retryWrites=true&w=majority"
export PORT_NUMBER=3002
export APP_SECRET_KEY="fastech_offcial_786"
export CLIENT_ID="293248084081-tj6qmn37qr1gkema8jdkpneek6tjq37f.apps.googleusercontent.com"
export CLIENT_SECRET="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"
export REDIRECT_URI="http://54.165.81.130:3002/oauth2callback"
export OAUTH_REDIRECT_URL="http://54.165.81.130:3002/connect-account/connected"
export pm2 stop email-node-app
export pm2 start server.js  --name email-node-app
export pm2 logs
