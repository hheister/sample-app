/**
 *  Javascript file to setup the sample app database.
 */
var uuid = require('node-uuid');

var Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server,
    async = require('async'),
    ifAsync = require('if-async'),
    MongoClient = require('mongodb').MongoClient,
    local = require("../local.config.js");

var host = local.config.db_config.host
    ? local.config.db_config.host
    : 'localhost';
var port = local.config.db_config.port
    ? local.config.db_config.port
    : Connection.DEFAULT_PORT;
var ps = local.config.db_config.poolSize
    ? local.config.db_config.poolSize : 5;
/*
var db = new Db('SampleApp',
                new Server(host, port,
                           { auto_reconnect: true,
                             poolSize: ps}),
                { w: 1 });
*/
//var url = 'mongodb://heroku_app37413426:c2qshsi9d8lrv0p9usgod8amom@ds043022.mongolab.com:43022/heroku_app37413426';

var db = null;

exports.init = function (callback) {
  // Create the users and jobs collections if they do not exist already
  console.log('\n\n##############  Start Mongo DB Init #######################');
  async.waterfall([
  		function (cb) {
			var db_uri = local.config.db_uri;
			console.log(db_uri);
			// Use connect method to connect to the Server
			MongoClient.connect(db_uri, cb);
		},
        function (database, cb) {
            db = database;
            cb(); // This will pass no argument to the next functions in the waterfall
        },
        ifAsync(doesJobsExist).then(exportJobsCollection).else(createJobsCollection),
        function(cb) {
          cb();
        },
        ifAsync(doesUsersExist).then(exportUsersCollection).else(createUsersCollection),
        function(cb) {
          cb();
        }

      ], function(err) {
        console.log('################### End of MongoDB Init ##################');
        callback();
      });
};

function createUsersCollection(jobsCollection, callback) {
  async.waterfall([
        function (cb) {
            console.log("\nCreating Users collection...");
            db.collection("users", cb); // Create users collection
        },
        function(usersCollection, cb) {
            // Find all the jobs in the jobsCollection
            jobsCollection.find().toArray(function(err, jobs) {
                cb(null, usersCollection, jobs); // pass the usersCollection and jobs to the next waterfall function
            });
        },
        function (usersCollection, jobs, cb) {
            exports.users = usersCollection;
            var developerID, executiveID, visualDesignerID, managerID;
            for (var i = 0; i < jobs.length; i++) {
                var job = jobs[i];
                if (job.name === "Visual Designer") {
                    visualDesignerID = job._id;
                } else if (job.name === "Developer") {
                    developerID = job._id;
                } else if (job.name === "Executive") {
                    executiveID = job._id;
                } else if (job.name === "Manager") {
                    managerID = job._id;
                }
            }
            // Insert some default users
            var docs = [{ id: uuid.v1(),
                        name:"Horst Heistermann",
                        title:"Consulting Member Technical Staff",
                        date:"2012/02/15",
                        description:"UI Expert",
                        jobID: developerID,
                        citizen: true
                    },
                    {   id: uuid.v1(),
                        name:"Jordan Raykov",
                        title:"Software Engineer",
                        date:"2010/10/20",
                        description:"UI Expert",
                        jobID: developerID,
                        citizen: false
                    },
                    {   id: uuid.v1(),
                        name:"Kevin Kim",
                        title:"Visual Designer",
                        date:"2010/06/10",
                        description:"Graphics Artist",
                        jobID: visualDesignerID,
                        citizen: false
                    },
                    {   id: uuid.v1(),
                        name:"Larry Ellison",
                        title:"CTO",
                        date:"2010/06/10",
                        description:"Founder",
                        jobID: executiveID,
                        citizen: true
                    }
            ];

            console.log("\n** Inserting default users... docs.length:" + docs.length);
            usersCollection.insert(docs, null, cb);
        },

        function (users, cb) {
            console.log("added users: ");
            console.log(users);
            cb(null);
        }
    ], callback);
}

function getJobDatabaseId(jobName, callback) {
    async.waterfall([
            function (cb) {
                exports.jobs.find({name: jobName}, cb)
            },
            function(results, cb) { // results contains the cursor from the find
                results.toArray(cb);
            },
            function (documents, cb) { // documents is the result from the call to toArray
                var theDoc = documents[0];
                cb(null, theDoc._id);
            }
        ],
        function (err, results) { // waterfall cleanup
            callback(err, results);
        }
    );
}

function exportUsersCollection(callback) {
  console.log('exportUsersCollection exports.users=' + exports.users.collectionName);
  // need to call the callback for the waterfall to progress
  callback(null);
}

function createJobsCollection(callback) {
  async.waterfall([
        function (cb) {
            console.log("\nCreating Jobs collection...");
            db.collection("jobs", cb);
        },

        function (jobsCollection, cb) {
            exports.jobs = jobsCollection;

            // Insert some default jobs
            var docs = [{
                      name:"Developer",
                      salary:"5,000,000",
                      vacation:"3 months"
                    },
                    {
                      name:"Visual Designer",
                      salary:"30,000",
                      vacation:"2 weeks"
                    },
                    {
                      name:"Manager",
                      salary:"50,000",
                      vacation:"4 weeks"
                    },
                    {
                        name:"Executive",
                        salary:"2,000,000",
                        vacation:"6 weeks"
                    }];

            console.log("\n** Inserting default jobs...");
            jobsCollection.insert(docs, { safe: true }, cb);
        },
        function (jobs, cb) {
            console.log("Added Jobs: ");
            console.log(jobs);
            cb(null, jobs);
        },
        function(jobs, cb) {
            generateJobIDToNameMap(cb);
        },
        function (idToNameMap, cb) {
            exports.jobIDToNameMap = idToNameMap;
            cb(null, exports.jobs);
        },
        function(jobs, cb) {
            createUsersCollection(jobs, cb);
        },
        function (cb) {
            cb(null);
        }
    ],
      callback);

}

function exportJobsCollection(callback) {
    async.waterfall([
            function(cb) {
                console.log('exportJobsCollection exports.jobs=' + exports.jobs.collectionName);
                cb(null);
            },
            function(cb) {
                generateJobIDToNameMap(cb);
            },
            function (idToNameMap, cb) {
                exports.jobIDToNameMap = idToNameMap;
                cb(null, idToNameMap);
            }
        ],
        function(err, results) {
            callback(err);
        }
    );
}

function doesUsersExist(callback) {
    db.collection("users", {strict:true}, function (err, collection) {
      exists = collection != null;
      if (exists) {
        exports.users = collection;
        console.log('Users collection already exists');
      } else {
        console.log('Users DOES NOT exists!');
      }
      callback(null, exists); // this will determine if  createUsersCollection or exportUsersCollection is called next
    });
}

function doesJobsExist(callback) {
    db.collection("jobs", {strict:true}, function (err, collection) {
      exists = collection != null;
      if (exists) {
        exports.jobs = collection;
        console.log('Jobs collection already exists');
      } else {
        console.log('Jobs DOES NOT exists!');
      }
      callback(null, exists);  // this will determine if  createJobsCollection or exportJobsCollection is called next
    });
}

function generateJobIDToNameMap(callback) {
    async.waterfall([
            function (cb) {
                exports.jobs.find(cb);
            },
            function(results, cb) { // results contains the cursor from the find
                results.toArray(cb);
            },
            function (documents, cb) { // documents is the result from the call to toArray
                var mapObject = {};
                for (var i = 0; i < documents.length; i++) {
                    var job = documents[i];
                    var jobID = job._id;
                    var jobName = job.name;
                    mapObject[jobID] = jobName;
                }
                cb(null, mapObject);
            }
        ],
        function(err, results) {
            callback(err, results);
        }
    );
}

exports.users = null;
exports.jobs = null;
exports.jobIDToNameMap = {};

