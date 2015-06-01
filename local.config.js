

exports.config = {
    //db_uri: 'mongodb://localhost:27017/SampleApp',
    db_uri: 'mongodb://heroku_app37418932:heroku_app37418932@ds043082.mongolab.com:43082/heroku_app37418932',
    db_config: {
        host: "localhost",
        // use default "port"
        poolSize: 20
    },

    static_content: "../static/"
};

