const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json());
const fetch = require('node-fetch');
const request = require('request');

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
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
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
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Hello, are you ready for some optimism? ",
            "subtitle": "Tap a button to answer",
            "buttons": [
              {
                "type": "postback",
                "title": "Yes",
                "payload": "yes",
              },
              {
                "type": "postback",
                "title": "No",
                "payload": "no",
              }
            ],
          }]
        }
      }
    }
  }
  callSendAPI(sender_psid, response);
}

function handlePostback(sender_psid, received_postback) {
  let response;

  let payload = received_postback.payload;

  if (payload === 'yes') {
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "What do you want information about today?",
            "subtitle": "Tap an option",
            "buttons": [
              {
                "type": "postback",
                "title": "Vaccines",
                "payload": "vaccines",
              },
              {
                "type": "postback",
                "title": "COVID Cases",
                "payload": "cases",
              },
              {
                "type": "postback",
                "title": "Anything Else",
                "payload": "other",
              }

            ],
          }]
        }
      }
    }

  }
  else if (payload === 'no') {
    response = {'text': "Ugh I get it. Come back whenever you are ready, your friendly neighborhood good news bot will be here."}
  }
  else if (payload === 'other') {
    request({
      "uri": `https://api.nytimes.com/svc/mostpopular/v2/shared/1/facebook.json?api-key=${'txHI43IcrawEsJzOm3NTPW2BtEEtnotb'}`,
      "method": "GET"
    }, (err, res, body) => {
      if (!err) {
        console.log(res.json());
        //var str =''

        //for (var i=0; i<res.body.results.length; i++) {
          //str = str + res.body.results[i].title + " ";
        //}
        //response = str;

      } else {
        console.log('An error occured'+error);
      }

    });
  }
  callSendAPI(sender_psid, response);
}

function callSendAPI(sender_psid, response) {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  };

  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}
