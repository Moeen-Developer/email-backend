const { google } = require('googleapis');
const fs = require('fs');
const OAuth2 = google.auth.OAuth2;
const base64url = require('base64url');
const readline = require('readline');
const moment = require('moment');
const cheerio = require('cheerio'); // To parse HTML content

const oauth2Client = new OAuth2(
  '293248084081-tj6qmn37qr1gkema8jdkpneek6tjq37f.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/oauth2callback'
);

const connectGoogleAccount = (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
    res.redirect(authUrl);
  
  } catch (error) {
    console.error(error);
    res.status(500).json({massage: 'Internal server error'});
    
  }
};

const callBack = async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
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
  
    oauth2Client.setCredentials(tokens)

  
    res.redirect('/emails');
  } catch (error) {
    console.error(error);
    res.status(500).json({massage: 'Internal server error'});
    
  }
};

const getAllEmails = async (req, res) => {
  try {
    const { page = 1, perPage = 50 } = req.query;
    const startIndex = (page - 1) * perPage;
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
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
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
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


module.exports ={
  connectGoogleAccount,
  callBack,
  getAllEmails,
  getEmailById
}
