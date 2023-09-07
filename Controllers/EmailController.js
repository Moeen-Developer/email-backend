const { google } = require('googleapis');
const fs = require('fs');
const OAuth2 = google.auth.OAuth2;
const base64url = require('base64url');
const readline = require('readline');
const moment = require('moment');
const cheerio = require('cheerio'); // To parse HTML content
const uuid  = require('uuid')
const User = require("../Models/UserModel");



const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CALENDER_SCOPES = ['https://www.googleapis.com/auth/calendar'];

const oAuth2Client = new OAuth2(
  '293248084081-tj6qmn37qr1gkema8jdkpneek6tjq37f.apps.googleusercontent.com',
  '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',
  'http://localhost:3001/oauth2callback'
);

const connectGoogleAccount = (req, res) => {
  try {
    const userId = req.params.userId;
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [GMAIL_SCOPES, CALENDER_SCOPES].join(' '),
    });
    req.session.userId = userId;
    res.redirect(authUrl);
  
  } catch (error) {
    console.error(error); 
    res.status(500).json({massage: 'Internal server error'});
    
  }
};

const callBack = async (req, res) => {
  try {
    // const userId = req.session.userId
    const code = req.query.code;
    const { tokens } = await oAuth2Client.getToken(code);
    console.log(tokens);
    const userId = req.session.userId; // Make sure userId is stored in the session
    console.log(userId);

       // Update the user's 'isAccountConnected' field to true
       const user = await User.findById(userId);
       if (!user) {
         return res.status(404).json({ message: 'User not found' });
       }
   
       // Update the isAccountConnected field
       user.isAccountConnected = true;
   
       // Save the updated user
       await user.save();
      // Parse and format the expiry date 
      const expiryDate = new Date(tokens.expiry_date);
      const formattedExpiryDate = expiryDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
  
    console.log('Formatted Expiry Date:', formattedExpiryDate);

        // // Retrieve the user document from the database (you may need to adapt this to your actual database setup)
        // const user = await User.findById(userId);

        // if (!user) {
        //   return res.status(404).json({ message: 'User not found' });
        // }
    
        // // Update the isAccountConnected field to true
        // user.isAccountConnected = true;
    
        // // Save the updated user document
        // await user.save();
  
  
    oAuth2Client.setCredentials(tokens)
    // res.redirect('/emails');
    // res.send('Authentication successful! You can now use the API to schedule meetings.');
    res.redirect('http://localhost:3001/redirect/connected');


  } catch (error) {
    console.error(error);
    res.status(500).json({massage: 'Internal server error'});
    
  }
};

const getAllEmails = async (req, res) => {
  try {
    const { page = 1, perPage = 50 } = req.query;
    const startIndex = (page - 1) * perPage;
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: perPage,
      pageToken: startIndex !== 0 ? req.query.nextPageToken : undefined,
    });
    const emails = [];
    // const emails = response.data.messages;
    const nextPageToken = response.data.nextPageToken;

    for (const message of response.data.messages) {
      const messageDetails = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });
      const currentTime = new Date();
      const sender = messageDetails.data.payload.headers.find(header => header.name === 'From').value;
      const subject = messageDetails.data.payload.headers.find(header => header.name === 'Subject').value;
      const timestamp = new Date(Number(messageDetails.data.internalDate));
      
      if (timestamp.toDateString() === currentTime.toDateString()) {
        formattedTimestamp = timestamp.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        });
      } else if (currentTime - timestamp <= 7 * 24 * 60 * 60 * 1000) {
        formattedTimestamp = timestamp.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        });
      } else {
        formattedTimestamp = timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }


      emails.push({
        id: message.id,
        sender: sender,
        subject: subject,
        timestamp: formattedTimestamp,
      });
    }
    res.json({
      emails: emails,
      nextPageToken: nextPageToken || null,
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json('Internal server error')
    
  }
};

const getEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const response = await gmail.users.messages.get({
      userId: 'me',
      id,
    });

    const emailContent = response.data;
    const timestamp = new Date(Number(emailContent.internalDate));
    // const formattedTimestamp = timestamp.toLocaleString('en-US', {
    //   hour: 'numeric',
    //   minute: 'numeric',
    //   hour12: true,
    // });
    const formattedTimestamp = moment(timestamp).fromNow();


    const sender = emailContent.payload.headers.find(
      (header) => header.name === 'From'
    ).value;
    const subject = emailContent.payload.headers.find(
      (header) => header.name === 'Subject'
    ).value;
    const to = emailContent.payload.headers.find(
      (header) => header.name === 'To'
    ).value;
    const date = moment(timestamp).format('M  MM D, YYYY, h:mm A');

    const emailHeader = `
      <div style="background-color: #f4f4f4; padding: 10px;">
      <div style="font-weight: bold;">From: ${sender}</div>
      <div>To: ${to}</div>
      <div>Date: ${date}</div>
      <div>Subject: ${subject}</div>
      <div>Sent: ${formattedTimestamp}</div>
      </div>
    `;

    const htmlPart = emailContent.payload.parts.find(
      (part) => part.mimeType === 'text/html'
    );

    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      const decodedEmailContent = base64url.decode(htmlPart.body.data);

      // Load the HTML content into Cheerio for parsing
      const $ = cheerio.load(decodedEmailContent);

      $('img').each(async (_, elem) => {
        const imgSrc = $(elem).attr('src');
        if (imgSrc && !imgSrc.startsWith('http')) {
          // Fetch the image
          try {
            const response = await axios.get(imgSrc, { responseType: 'arraybuffer' });
            if (response.status === 200) {
              const imageSrc = `data:${response.headers['content-type']};base64,${Buffer.from(response.data, 'binary').toString('base64')}`;
              $(elem).attr('src', imageSrc);
            }
          } catch (error) {
            console.error(`Error fetching image: ${error}`);
          }
        }
      });

      // Find the body of the email
      const emailBody = $('body');

      // Insert the email header at the beginning of the email body
      emailBody.prepend(emailHeader);

      // Update relative image URLs to absolute URLs if necessary
      $('img').each((_, elem) => {
        const imgSrc = $(elem).attr('src');
        if (imgSrc && !imgSrc.startsWith('http')) {
          const absoluteImgSrc = `https://mail.google.com/mail/u/0/?ui=2&ik=mhassansohail2001@gmail.com&view=att&th=${id}&attid=0.${id}&disp=emb&realattid=f_junzgvtc0&zw`;
          $(elem).attr('src', absoluteImgSrc);
        }
      });

      // Send the modified HTML content to the frontend
      res.send($.html());
      return;
    }
    

    // If no HTML part found, send a plain text representation
    res.send(`<p>${emailContent.snippet}</p>`);
    
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal server error");
    
  }
};
const scheduleMeeting = async (auth, meetingDetails) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const requestId = uuid.v4();

    const event = {
        summary: meetingDetails.title,
        location: meetingDetails.location,
        description: meetingDetails.description,
        start: {
          dateTime: meetingDetails.startDateTime,
          timeZone: meetingDetails.timeZone,
        },
        end: {
          dateTime: meetingDetails.endDateTime,
          timeZone: meetingDetails.timeZone,
        },
        attendees: meetingDetails.attendees,
        sendNotifications: true,
        conferenceData: {
            createRequest: {
                requestId: requestId, // Use a unique identifier here
            }
        }
      };
    const response = await calendar.events.insert({
      calendarId: 'primary', // Use 'primary' for the user's primary calendar
      resource: event,
      conferenceDataVersion: 1,
    });

    console.log('Event created: %s', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    throw error;
  }
}

const celenderMeeting = async (req, res) => {
  try {
    const meetingDetails = req.body; // Get meeting details from the request body
    const event = await scheduleMeeting(oAuth2Client, meetingDetails);
    res.json({ message: 'Meeting scheduled successfully', event });
  } catch (error) {
    res.status(500).json({ message: 'Failed to schedule meeting', error: error.message });
  }
}

const getAllMeetings = async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary', // Use 'primary' for the user's primary calendar
      timeMin: new Date().toISOString(),
      maxResults: 10, // You can change this to the desired number of events to retrieve
      singleEvents: true,
      orderBy: 'startTime',
    });

    const meetings = response.data.items.map((event) => ({
      id: event.id,
      summary: event.summary,
      location: event.location,
      description: event.description,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }));

    res.json({ meetings });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



module.exports ={
  connectGoogleAccount,
  callBack,
  getAllEmails,
  getEmailById,
  celenderMeeting,
  getAllMeetings
}
