fetchervar csv = require('fast-csv');
var row_CSV = []
var question_CSV = []
var FB = require('fb');

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var Spinner = require('cli-spinner').Spinner;
var spinner;
var stream = fs.createReadStream("my.csv");
var page_id = '';
// var spreadsheetId = "";

var range = "26-Nov!S3:U"
var range1 = "26-Nov!V3"

// var range = "20-Nov!AF3:AH"
// var range1 = "20-Nov!AI3"

console.time("time_taken", "s")

var csvStream = csv()
  .on("data", function (data) {
    row_CSV.push(data)
    question_CSV.push(data[0])
  })
  .on("end", function () {
    console.log("Read from" + " my.csv!");
  });

stream.pipe(csvStream);


// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), listMajors);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function (err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function (code) {
    rl.close();
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

var links = [];
var finalD = [];
var totalCon = [];
var vvii = [];

function listMajors(auth) {
  var spinner = new Spinner('Fetching rows from Google Sheets %s');
  spinner.setSpinnerString("⠂-–—–-");
  spinner.start();
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
    auth: auth,
    spreadsheetId: spreadsheetId,
    range: range
  }, function (err, response) {
    spinner.stop()
    console.log("\nFetched %s rows", response.values.length);
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var rows = response.values;
    var metrics = "insights?metric=post_impressions_unique,post_consumptions_by_type,post_stories,post_negative_feedback_by_type";
    if (rows.length == 0) {
      console.log('No data found.');
    } else {
      var n = 3;
      var j = 1;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.length > 0 && row[0].split('/').length === 6 && !!row[0] && row[1].split('/').length === 7 && !!row[1]) {
          links.push({ "method": "GET", "relative_url": `${page_id}_${row[0].split('/')[5]}/${metrics}` })
          var question = row[1].split('/')[5]
          var index = question_CSV.indexOf(question);

          if (index == -1) {
            vvii.push(i)
            totalCon.push(parseFloat(row_CSV[index + 1][3]).toFixed(2))
          } else if (index != -1 && row_CSV[index]) {
            vvii.push(i)
            totalCon.push(parseFloat(row_CSV[index][3]).toFixed(2))
          }
        } else {
          totalCon.push('')
        }
      }
      callLater(auth)
    }
  })
}


function callLater(auth) {
  var content = [];
  var spinner = new Spinner('Fetching data from Facebook. %s');
  spinner.setSpinnerString("⠂-–—–-");
  spinner.start();

  FB.api("graph.facebook.com",
    'POST',
    { access_token: access_token, batch: links }, function (resp) {
      spinner.stop();
      console.log("\nFetched data for %s rows", resp.length);
      resp.map((e, i) => {
        var fb_response = JSON.parse(e.body);
        var object = {};
        // console.log(fb_response);
        (fb_response.data && fb_response.data.map((f, j) => {
          if (f.name === 'post_impressions_unique')
            object.reaches = f.values[0].value || 0

          if (f.name === 'post_consumptions_by_type')
            object.link_clicks = f.values[0].value["link clicks"] || 0

          if (f.name === 'post_stories')
            object.interactions = f.values[0].value || 0

          if (totalCon[vvii[i]]) {
            object.avg_pg_consume = totalCon[vvii[i]]
          }

          if (f.name === 'post_negative_feedback_by_type') {
            object.hide_all_clicks = f.values[0].value.hide_all_clicks || 0
            object.hide_clicks = f.values[0].value.hide_clicks || 0
          }
        }))
        content.push(Object.assign({}, object));
      })
      manInMiddle(auth, content);
    })
}
function manInMiddle(auth, content) {
  var finalArray = [];
  var j = 0;
  vvii.map((e, i) => {
    finalArray[e] = [content[i].reaches || 0, content[i].link_clicks || 0, (parseFloat(((content[i].link_clicks / content[i].reaches) * 100)).toFixed(2)) == "NaN" ? 0 : (parseFloat(((content[i].link_clicks / content[i].reaches) * 100)).toFixed(2)) + "%", content[i].avg_pg_consume || 0, (content[i].avg_pg_consume * 5) || 0, content[i].interactions || 0, `${content[i].hide_clicks || 0} hide post,${content[i].hide_all_clicks || 0} hide all posts`];
  })
  var finalArray = JSON.parse(JSON.stringify(finalArray));
  finalArray.map((k, i) => { if (!!!k) { finalArray[i] = [] } })
  googleAPI(auth, finalArray);
}

function googleAPI(auth, data) {
  var spinner = new Spinner('Updating to Google Sheet. %s');
  spinner.setSpinnerString("⠂-–—–-");
  spinner.start();
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: range1,
    valueInputOption: "USER_ENTERED",
    resource: { values: data },
    auth: auth
  }, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      spinner.stop()
      console.log('\n%d cells updated.', result.updatedCells);
      console.timeEnd("time_taken", "s")
    }
  });
}