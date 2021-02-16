const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json());

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

}

function handlePostback(sender_psid, recieved_postback) {

}

function callSendAPI(sender_psid, response) {

}
