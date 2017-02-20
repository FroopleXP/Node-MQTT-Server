var mongoose = require('mongoose'),
    bcrypt = require('bcrypt'),
    config = require('../config/settings.js');

var api_key = mongoose.Schema({
    api_key: {
        passphrase: {
            type: String,
            required: [true, "You must provide a passphrase"]
        },
        key: {
            type: String,
            required: [true, "Failed to generate key"]
        },
        valid_from: {
            type: Date,
            default: Date.now
        }
    }
});

// Creating a methods that checks if a provided password matches a hashed password
api_key.methods.comparePassword = function(pass_to_compare, callback) {
    bcrypt.compare(pass_to_compare, this.api_key.passphrase, function(err, isMatch) {
        if (err) return callback(err);
        callback(null, isMatch);
    });
}

// Encrypt the passphrase before we save them to the shed
api_key.pre('save', function(next) {

    var self = this;

    // Only hash the password if it already hasn't been
    if (!self.isModified('api_key.passphrase')) return next();

    // Generate the salt for the password
    bcrypt.genSalt(config.security.pass_salt, function(err, salt) {
        // Checking for errors...
        if (err) return next(err);
        // Encrypting the password with the generated salt
        bcrypt.hash(self.api_key.passphrase, salt, function(err, hash) {
            if (err) return next(err); // Checking for errors...
            self.api_key.passphrase = hash; // Setting the password equal to the newly encrypted one
            // SOMEHOW WE STILL CARRY ON!
            next();
        });
    });

});

// Exporting the model
module.exports = mongoose.model('api_key', api_key);
