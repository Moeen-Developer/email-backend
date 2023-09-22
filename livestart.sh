export MONGODB_URL="mongodb+srv://admin:admin@cluster0.s7abq5t.mongodb.net/?retryWrites=true&w=majority"
export PORT_NUMBER=3001
export APP_SECRET_KEY=fastech_offcial_786
export CLIENT_ID="354319124477-ormcs6qtdgjfjf4eu0s7ch8j04eihh5o.apps.googleusercontent.com"
export CLIENT_SECRET="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"
export REDIRECT_URI="http://127.0.0.1:3001/oauth2callback"
pm2 stop email-node-app
pm2 start Server.js  --name email-node-app
pm2 logs
