// Requiring dependencies
var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    hat = require('hat'),
    mosca = require('mosca'),
    config = require('./config/settings.js'),
    jwt = require('jsonwebtoken'),
    api_keys = require('./models/api_key_model.js');

// Creating the setting up the app
var app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Setting up the mqtt broker
var pubsubsettings = {
    type: 'mongo',
    url: 'mongodb://localhost:27017/mosca',
    pubsubCollection: 'ascoltatori',
    mongo: {}
};

var moscaSettings = {
    port: 1883,
    backend: pubsubsettings
};

// Used to authenticate the device
var auth_connection = function(client, username, password, callback) {

    console.log("Something is trying to connect!");

    // Making a local version of the username and password
    var auth_password = password,
        auth_username = username;

    // Checking that the Username and password have been supplied
    if (typeof password !== 'undefined' && typeof username !== 'undefined') {
        // Checking that the API key exists
        api_keys.findOne({ 'api_key.key': auth_username }, function(err, api_key) {
            if (err) { console.log(err); callback(true); }
            if (api_key) {
                // Checking that the password exists
                api_key.comparePassword(auth_password.toString(), function(err, match) {
                    if (err) { console.log(err); callback(true); }
                    if (match) {
                        // Signing a token for the device to authenticate with
                        client.auth_token = jwt.sign({ api_key: api_key.key }, config.security.token_secret, { expiresIn: '1y' });
                        console.log("AUTHENTICATION_SUCCESS");
                        callback(null, true);
                    } else {
                        console.log("AUTHENTICATION_FAILED_ACCESS_DENIED 0x01");
                        callback(true);
                    }
                });
            } else {
                console.log("AUTHENTICATION_FAILED_ACCESS_DENIED 0x02");
                callback(true);
            }
        });
    } else {
        console.log("AUTHENTICATION_FAILED_ACCESS_DENIED 0x03");
    }
}

// Creating a new mqtt server instance
var mqtt_server = new mosca.Server(moscaSettings);

// Waiting for the server to start...
mqtt_server.on('ready', function() {
    // Setting the auth
    mqtt_server.authenticate = auth_connection;
    console.log("MQTT Server started...");
});

// Connecting to MongoDB
mongoose.connect(config.db.url, function(err) {
    if (err) { throw err; }
    else { console.log("Connected to mongo!"); }
});

app.get('/', function(req, res) {
    res.render('app.ejs');
});

// Routes
app.get('/api_key', function(req, res) {
    // Sending the webpage
    res.render('generate_key.ejs');
});

app.post('/remote_control', function(req, res) {
    mqtt_server.publish({
        topic: 'PIGGY_CAR/CONTROL',
        payload: req.body.data,
        qos: 0,
        retain: false
    }, function() {
        res.sendStatus(200);
    });
});

app.post('/new_api_key', function(req, res) {
    var api_key = require('./models/api_key_model.js');
    // Getting the passphrase
    var passphrase = req.body.passphrase;
    // Validating the key
    if (passphrase.length < 5) {
        res.json({ message: "Passphrase must be longer than 5 characters" });
    } else {

        // Creating a new key
        var api_key = new api_key(),
            key = hat();

        api_key.api_key.key = key;
        api_key.api_key.passphrase = passphrase;

        // Saving the key
        api_key.save(function(err, api_key) {
            if (err) { res.json({ message: err }); }
            else { res.json({ message: api_key }); }
        });

    }
});

app.listen(8080, function() {
    console.log("HTTP Server started...");
});
