const express = require('express');
const router = express.Router();
const EmailController = require("../Controllers/EmailController");


// Route to fetch all emails for a user
router.get('/auth', EmailController.connectGoogleAccount);
router.get("/oauth2callback", EmailController.callBack);
router.get("/emails", EmailController.getAllEmails);
router.get("/getEmailById/:id", EmailController.getEmailById);
router.post("/schedule-meeting", EmailController.celenderMeeting);
router.get('/meetings', EmailController.getAllMeetings);

module.exports = router;