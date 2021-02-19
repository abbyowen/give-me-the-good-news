/*
Author: Abby Owen
Date: February 2021
Purpose: Create a Facebook bot to provide (hopefully) positive news about coronavirus
all in ones place
*/

// Require packages
const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json());
const fetch = require('node-fetch');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
const request = require('request');

// Initialize Natural Language Understanding SDK
const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  version: '2020-08-01',
  authenticator: new IamAuthenticator({
    apikey: process.env.IBM_KEY,
  }),
  serviceUrl: process.env.IBM_SERVICE_URL,
});

// Access Tokens
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const GIPHY_KEY = process.env.GIPHY_KEY;
const NYT_KEY = process.env.NYT_KEY;

// Listen
app.listen(process.env.PORT || 8888, () => console.log('webhook is listening'));

// Webhook
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

  let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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

// Handle messages sent to the page
function handleMessage(sender_psid, recieved_message) {
  var response;
  // Handle initial message (just a random text sent to the page)
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
  // Send message
  callSendAPI(sender_psid, response);
}

// Handle postbacks from the user
function handlePostback(sender_psid, received_postback) {
  let response;
  // Postback payload
  let payload = received_postback.payload;

  /* If the user says they are ready for optimism, offer them three options to choose from
      -COVID
      -Vaccines
      -Other
  */
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
  // If the user says they are not ready for optimism, send them a message to come back when they are
  else if (payload === 'no') {
    response = {'text': "Ugh I get it. Come back whenever you are ready, your friendly neighborhood good news bot will be here."}
  }

  /* If the user chooses "Anything Else":
    -Offer the user the top stories, controlled to not include political or COVID keywords
    -Offer them another option: randomized choice of a random GIF from GIPHY or a
      movie review from The New York Times
  */
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
  // If the user selects top_stories, send response and get the top stories from NYT API
  else if (payload === 'top_stories') {
    response = {"text": "Alright, I'll take a look."}
    getOtherArticles(sender_psid);
  }

  // If the user selects the other option ("No"), provide them with a randomized response
  else if (payload === 'not_top_stories') {
    response = {'text': "Ok. I won't lie, you are hard to please. I'll find something for you."}
    // Random number (1 or 2), controls which response the user will recieve
    var num = Math.floor((Math.random() * 2) + 1);
    if (num == 1) {
      // Get movie review
      console.log("Getting movie review");
      getMovieReview(sender_psid);
    }
    else if (num == 2) {
      // Get GIF
      console.log("Getting GIF");
      getGIPHY(sender_psid);
    }

  }
  // If user selects Yes->Vaccines provide the user with positive vaccine stories
  else if (payload === 'vaccines') {
    response = {"text": "Let's see if there is any positive news on the COVID-19 Vaccine front today."};
    getVaccineNews(sender_psid);
  }
  // If user selects Yes->COVID Cases provide the user with positive COVID stories
  else if (payload === 'cases') {
    response = {"text": "Let's see if there is any positive news on the COVID-19 front today."};
    getCOVIDNews(sender_psid);
  }
  // Send response
  console.log(`response: ${response}`);
  callSendAPI(sender_psid, response);
}

// Function to send messages to the user
function callSendAPI(sender_psid, response) {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  };
  // API call to Facebook Messenger API to send message (From starter code)
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

// Get Top Stories function
function getOtherArticles(sender_psid) {
  // Get the most shared articles on Facebook from the NYT top stories API
  fetch(`https://api.nytimes.com/svc/mostpopular/v2/shared/1/facebook.json?api-key=${NYT_KEY}`).then(data=>data.json()).then(
    function(result) {
      console.log(result);
      // Iterate through each article in the response
      for (var i=0; i<result.results.length; i++) {
        // Article title
        var title = result.results[i].title;
        // Words to avoid (political, virus, negative)
        var target_words = ["Trump", "COVID", "Coronavirus", "Pandemic", "Lockdown", "Bad", "Sad", "Disease", "Covid-19", "Covid", "Impeachment", "Impeached", "Dies", "Die", "Senate", "Lonely", "coronavirus", "Senator", "Governer"];
        // Include variable: if true, include article. if false, exclude article
        var include = true;
        for (var j=0; j<target_words.length; j++) {
          // if the title of the article contains any of these words, exclude it from being sent to the user
          if (title.includes(target_words[j])) {
            include = false;
          }
        }
        // Send article link and title to the user if it is set to be included
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
    }).catch(err => {
      console.log('error:', err);
      // Send message to the user if an error occurs
      response = {"text": "Oops, an error occured"};
      callSendAPI(sender_psid, response);
    });

}
// Get Movie Reviews function
function getMovieReview(sender_psid) {
  // Call NYT Movie Review endpoint to get movie reviews by opening date
  fetch(`https://api.nytimes.com/svc/movies/v2/reviews/picks.json?order=by-opening-date&api-key=${NYT_KEY}`).then(
    data=>data.json()).then(function(result) {
      console.log(`result: ${result.results}`);
      // Choose a random index of movie review to send to the user
      var idx = Math.floor((Math.random() * result.results.length) + 1);
      console.log(`review idx: ${idx}`);
      // Get the review at the random index
      var review = result.results[idx];
      // String with the movie title and message to send to the user
      var str = `Here is a recent movie review for the film ${result.results[idx].display_title}. I hope this can distract you from the world!`
      response = {'text': str};
      // Send the string response to the user
      callSendAPI(sender_psid, response);

      // Send user article attachment
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
    }).catch(err => {
      console.log('error:', err);
      // Send message to the user if an error occurs
      response = {"text": "Oops, an error occured"};
      callSendAPI(sender_psid, response);
    });
}

// Get Random GIF
function getGIPHY(sender_psid) {
  // Call GIPHY random GIF endpoint (tag: funny, rating: PG-13)
  fetch(`https://api.giphy.com/v1/gifs/random?api_key=${GIPHY_KEY}&tag=funny&rating=pg-13`).then(
    data=>data.json()).then(function(result) {
      console.log(`result: ${result.data.image_mp4_url}`);
      // Send user link to the GIF
      var response= {"text": `Alright, heres a random GIF that hopefully will brighten your day: ${result.data.image_mp4_url}`};
      console.log(`response: ${response}`);
      callSendAPI(sender_psid, response);

  }).catch(err => {
    console.log('error:', err);
    // Send message to the user if an error occurs
    response = {"text": "Oops, an error occured"};
    callSendAPI(sender_psid, response);
  });
}

// Get vaccine articles
function getVaccineNews(sender_psid) {
  // Fetch articles about the COVID vaccine using NYT Article Search endpoint
  fetch(`https://api.nytimes.com/svc/search/v2/articlesearch.json?q=vaccine&sort=newest&api-key=${NYT_KEY}`).then(
    data=>data.json()).then(function(result) {
      console.log(result);
      // Get the articles
      var articles = result.response.docs;
      // Get the sentiment of the article
      getSentiment(sender_psid, articles, "vaccine");

    }).catch(err => {
      console.log('error:', err);
      // Send message to the user if an error occurs
      response = {"text": "Oops, an error occured"};
      callSendAPI(sender_psid, response);
    });

}
// Get COVID articles
function getCOVIDNews(sender_psid) {
  // Fetch articles about COVID using NYT Article Search endpoint
  fetch(`https://api.nytimes.com/svc/search/v2/articlesearch.json?q=coronavirus&sort=relevance&api-key=${NYT_KEY}`).then(
    data=>data.json()).then(function(result) {
      console.log(result);
      // Get the articles
      var articles = result.response.docs;
      // Get the sentiment of the article
      getSentiment(sender_psid, articles, " ");

    }).catch(err => {
      console.log('error:', err);
      // Send message to the user if an error occurs
      response = {"text": "Oops, an error occured"};
      callSendAPI(sender_psid, response)
    });

}
// Get article sentiment by abstract content
async function getSentiment(sender_psid, articles, keyword) {
  // Keep track of how many articles are sent to the user
  var sent = 0;

  // Iterate through each article
  for (var i=0; i<articles.length; i++) {
    // Article snippet
    var snippet = articles[i].snippet;
    // Article URL
    var url = articles[i].web_url;
    // Article abstract
    var abstract = articles[i].abstract;
    console.log(snippet);
    console.log(abstract);
    // Check if the abstract contains the keywords
    if (abstract.includes(keyword)) {
      // Analysis params for the IBM sentiment analyzer
      var analyzeParams = {
        'text': abstract,
        'features': {
          'sentiment': {
            'document': true

        }
      }
    }
      // Analyze the sentiment of the articles by the article abstract
      await naturalLanguageUnderstanding.analyze(analyzeParams).then(analysisResults => {
        // Log the score and sentiment label of the abstract
        console.log(`result score: ${analysisResults.result.sentiment.document.score}`);
        console.log(`result sentiment: ${analysisResults.result.sentiment.document.label}`);
        // Get the sentiment label of the abstract
        var sentiment = analysisResults.result.sentiment.document.label;
        // Send the article to the user if the sentiment is positive or neutral
        if (sentiment == "positive" || sentiment == "neutral") {
          var response = {
            "attachment": {
              "type": "template",
              "payload": {
                "template_type": "generic",
                "elements": [{
                  "title": snippet,
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
          console.log(response);
          sent++;
          callSendAPI(sender_psid, response);

      }

      }).catch(err => {
        console.log('error:', err);
      });

    }
  }
  // Send the user a message if no articles matching the criteria can be found
  if (sent == 0){
    var response = {"text": "I'm sorry, we couldn't find any positively spun articles. Click another option or check back later."}
    callSendAPI(sender_psid, response);
  }
}
