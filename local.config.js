

exports.config = {
    //db_uri: 'mongodb://localhost:27017/SampleApp',
    db_uri: 'mongodb://heroku_app37413426:c2qshsi9d8lrv0p9usgod8amom@ds043022.mongolab.com:43022/heroku_app37413426',
    db_config: {
        host: "localhost",
        // use default "port"
        poolSize: 20
    },

    static_content: "../static/"
};

