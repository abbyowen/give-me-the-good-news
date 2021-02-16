const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json());
const fetch = require('node-fetch');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.listen(process.env.PORT || 8888, () => console.log('webhook is listening'));

app.post('/webhook', function(req, res) {
  let body = req.body;

  if (body.object == 'page') {
    body.entry.forEach(function(entry) {
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: '+ sender_psid);

      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } /*else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }*/
    });

    res.status(200).send('EVENT_RECEIVED');
  }

  else {
    res.sendStatus(404);
  }
});

app.get('/webhook', function(req, res) {

  let VERIFY_TOKEN = "14Bc0jkEo2001";

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode == "subscribe" && token == VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.send("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    }
    else {
      res.sendStatus(403);
    }
  }
});


function handleMessage(sender_psid, recieved_message) {
  let response;

  if (recieved_message.text) {
    response={
      "text": `Holy fuck this worked.`
    }
  }
  callSendAPI(sender_psid, response);
}

function handlePostback(sender_psid, recieved_postback) {

}

function callSendAPI(sender_psid, response) {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  };

  fetch(`https://graph.facebook.com/v2.6/me/messages`, {
    method: 'POST',
    headers: {
      "access_token": PAGE_ACCESS_TOKEN
    },
    body: {
      request_body
    }
  }).then(data=>data.json()).then(function(response) {
    console.log(response);
  })
}
