module.exports = {
    app: {
        port: 8080
    },
    db: {
        url: 'mongodb://WHERE_API_KEYS_STORED/mqtt'
    },
    security: {
        pass_salt: 10,
        token_secret: "ALL_THE_SECRETZ"
    }
}
