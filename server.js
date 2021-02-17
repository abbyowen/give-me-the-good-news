


const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json());
const fetch = require('node-fetch');
const request = require('request');



const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  version: '2020-08-01',
  authenticator: new IamAuthenticator({
    apikey: 'Cd58WKpMF2xN5PjQylXrP60AcCSgw4Vsd4dryl8DI0GQ',
  }),
  serviceUrl: 'https://api.eu-gb.natural-language-understanding.watson.cloud.ibm.com/instances/f956ef22-e85a-42da-86cb-0f25820ed0d2',
});

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const GIPHY_KEY = `k53sbC4lOlagxBH8PGoX4EDFEuxRSrBK`;
const NYT_KEY = 'txHI43IcrawEsJzOm3NTPW2BtEEtnotb';

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
  var response;

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
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Cool. Do you want to look at the most shared stories today?",
            "subtitle": "Tap an option",
            "buttons": [
              {
                "type": "postback",
                "title": "Yes",
                "payload": "top_stories",
              },
              {
                "type": "postback",
                "title": "No",
                "payload": "not_top_stories",
              }

            ],
          }]
        }
      }
    }
  }
  else if (payload === 'top_stories') {
    response = {"text": "Alright, I'll take a look."}
    getOtherArticles(sender_psid);
  }

  else if (payload === 'not_top_stories') {
    response = {'text': "Ok. I won't lie, you are hard to please. I'll find something for you."}
    var num = Math.floor((Math.random() * 2) + 1);
    if (num == 1) {
      console.log("Getting movie review");
      getMovieReview(sender_psid);
    }
    else if (num == 2) {
      console.log("Getting GIF");
      getGIPHY(sender_psid);
    }

  }

  else if (payload === 'vaccines') {
    response = {"text": "Let's see if there is any positive news on the COVID-19 Vaccine front today."};
    getVaccineNews(sender_psid);
  }

  console.log(`response: ${response}`);
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

function getOtherArticles(sender_psid) {
  fetch(`https://api.nytimes.com/svc/mostpopular/v2/shared/1/facebook.json?api-key=${NYT_KEY}`).then(data=>data.json()).then(
    function(result) {
      console.log(result);

      console.log(`result length: ${result.results.length}`);
      for (var i=0; i<result.results.length; i++) {
        var title = result.results[i].title;
        var target_words = ["Trump", "COVID", "Coronavirus", "Pandemic", "Lockdown", "Bad", "Sad", "Disease", "Covid-19", "Covid", "Impeachment", "Impeached", "Dies", "Die", "Senate", "Lonely", "coronavirus"];
        var include = true;
        for (var j=0; j<target_words.length; j++) {
          if (title.includes(target_words[j])) {
            include = false;
          }
        }
        if (include == true) {
          console.log(`including title: ${title}`);
          var url = result.results[i].url;

          var response = {
            "attachment": {
              "type": "template",
              "payload": {
                "template_type": "generic",
                "elements": [{
                  "title": title,
                  "subtitle": "Click to read.",
                  "default_action": {
                  "type": "web_url",
                  "url": url,
                  "webview_height_ratio": "tall",
                }
                }]
              }
            }
          }
          callSendAPI(sender_psid, response);
        }
     }
    });

}

function getMovieReview(sender_psid) {
  fetch(`https://api.nytimes.com/svc/movies/v2/reviews/picks.json?order=by-opening-date&api-key=${NYT_KEY}`).then(
    data=>data.json()).then(function(result) {
      console.log(`result: ${result.results}`);
      var idx = Math.floor((Math.random() * result.results.length) + 1);
      console.log(`review idx: ${idx}`);
      var review = result.results[idx];
      var str = `Here is a recent movie review for the film ${result.results[idx].display_title}. I hope this can distract you from the world!`
      response = {'text': str};
      callSendAPI(sender_psid, response);

      var response_2 = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": [{
              "title": `Movie review for ${result.results[idx].display_title}`,
              "subtitle": "I hope it's good! And if it's not, even better, you can laugh at it!",
              "default_action": {
              "type": "web_url",
              "url": result.results[idx].link.url,
              "webview_height_ratio": "tall",
            }
            }]
          }
        }
      }
      callSendAPI(sender_psid, response_2);
    });
}

function getGIPHY(sender_psid) {
  fetch(`https://api.giphy.com/v1/gifs/random?api_key=${GIPHY_KEY}&tag=funny&rating=pg-13`).then(
    data=>data.json()).then(function(result) {
      console.log(`result: ${result.data.image_mp4_url}`);
      var response= {"text": `Alright, heres a random GIF that hopefully will brighten your day: ${result.data.image_mp4_url}`};
      console.log(`response: ${response}`);
      callSendAPI(sender_psid, response);

  });
}

function getVaccineNews(sender_psid) {
  fetch(`https://api.nytimes.com/svc/search/v2/articlesearch.json?q=vaccine&sort=newest&api-key=${NYT_KEY}`).then(
    data=>data.json()).then(function(result) {
      console.log(result);
      var articles = result.response.docs;
      for (var i=0; i<articles.length; i++) {
        var snippet = articles[i].snippet;
        var url = articles[i].web_url;
        var title = articles[i].main;
        console.log(`main title: ${title}`);
        console.log(snippet);

        var analyzeParams = {
          'text': snippet,
          'features': {
            'sentiment': {
              'document': true

          }
        }
      }
      naturalLanguageUnderstanding.analyze(analyzeParams).then(analysisResults => {
        console.log(`result score: ${analysisResults.result.sentiment.document.score}`);
        console.log(`result sentiment: ${analysisResults.result.sentiment.document.label}`);
        var sentiment = analysisResults.result.sentiment.document.label;
        if (sentiment == "positive") {
          var response = {
            "attachment": {
              "type": "template",
              "payload": {
                "template_type": "generic",
                "elements": [{
                  "title": title,
                  "subtitle": "Click to read.",
                  "default_action": {
                  "type": "web_url",
                  "url": url,
                  "webview_height_ratio": "tall",
                }
                }]
              }
            }
          }
          callSendAPI(sender_psid, response);

        }

        }).catch(err => {
          console.log('error:', err);
        });

      }
    });

}
