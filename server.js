var path = require("path");
var express = require('express');
var async = require('async');
var fs = require('fs');
var db = require('./database/db.js');
var uuid = require('node-uuid');
var app = express();
var ObjectID = require('mongodb').ObjectID;

app.set('port', process.env.PORT || 8080);

//app.use(express.basicAuth("horst", "heidi"));

// Puts the parsed body in req.body (used in POST to get the data)
app.use(express.bodyParser());

// We want anything under the public directory to be accessible
app.use(express.static('public'));


// http://localhost:8080/html/sample.html
app.get('/sampleapp/html/:filename', function (req, res) {
	console.log('req.params.filename=' + req.params.filename);
    serve_static_file('html/' + req.params.filename, res);
});

// http://localhost:8080/json/sample.json
app.get('/sampleapp/json/:filename', function (req, res) {
    console.log('req.params.filename=' + req.params.filename);
    serve_static_file('json/' + req.params.filename, res);
});

// POST data url
app.post('/sampleapp/postData', function (req, res) {
    console.log('\n#####  postData   #######');
    console.log(req.body);
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.write('POST Data Received:\n\n' + JSON.stringify(req.body));
    res.end();
});

// POST job
app.post('/sampleapp/jobs', handleCreateJob);

// POST user
app.post('/sampleapp/users', handleCreateUser);

// Update a user
app.put('/sampleapp/user/:id', handleUpdateUser);

// Update a job
app.put('/sampleapp/job/:id', handleUpdateJob);

// Delete a user
app.delete('/sampleapp/user/:id', handleDeleteUser);

// Delete a job
app.delete('/sampleapp/job/:id', handleDeleteJob);

app.get('/sampleapp', function (req, res) {
     serve_static_file('public/index.html', res);
});
app.get('/sampleapp/users', handleGetUsers);
app.get('/sampleapp/jobs', handleGetJobs);
app.get('/sampleapp/usersdatatable', handleGetUsersDataTable);
app.get('*', four_oh_four);

function handleDeleteUser(req, res) {
    console.log('########## handleDeleteUser ##################');

    async.waterfall([
            function (cb) {
                var url = req.url;
                var idx = url.lastIndexOf('/');
                var id = url.slice(idx + 1);
                cb(null, id);
            },
            function (id, cb) {
                db.users.findAndRemove(
                    {id: id}, // query
                    [['_id','asc']],  // sort order
                    cb
                );
            }
        ],
        function (err, results) { // waterfall cleanup
            console.log('\nWATERFALL CLEANUP results:' + JSON.stringify(results));
            var jsonValue = JSON.stringify(results);
            if (err) {
                console.log("!!!!!  There was an error: ");
                console.log(err);
                jsonValue = JSON.stringify({error: "Error Occurred:" + err});
            } else {
                console.log("All operations completed without error.");
                jsonValue = JSON.stringify({result: true});
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(jsonValue);
        }
    );
}

function handleDeleteJob(req, res) {
    console.log('########## handleDeleteJob ##################');

    async.waterfall([
            function (cb) {
                var url = req.url;
                var idx = url.lastIndexOf('/');
                var id = url.slice(idx + 1);
                cb(null, id);
            },
            function (id, cb) {
                db.jobs.findAndRemove(
                    {_id: new ObjectID(id)}, // query
                    [['_id','asc']],  // sort order
                    cb
                );
            }
        ],
        function (err, results) { // waterfall cleanup
            console.log('\nWATERFALL CLEANUP results:' + JSON.stringify(results));
            var jsonValue = JSON.stringify(results);
            if (err) {
                jsonValue = JSON.stringify({error: "Error Occurred:" + err});
            } else if (results == null) {
                jsonValue = JSON.stringify({result: false, error:"Database could not delete job!"});
            } else {
                jsonValue = JSON.stringify({result: true});
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(jsonValue);
        }
    );
}

function handleCreateUser(req, res) {
    console.log('###########  handleCreateUser  #################');
    async.waterfall([
        function (cb) {
            var userData = req.body;
            var jobName = userData.jobName;
            var jobIDs = Object.keys(db.jobIDToNameMap);
            var jobID;
            for (var i = 0; i < jobIDs.length; i++) {
                var id = jobIDs[i];
                var name = db.jobIDToNameMap[id];
                if (name === jobName) {
                    jobID = id;
                    break;
                }
            }

            var doc = {
                id : uuid.v1(),
                name : userData.name,
                title : userData.title,
                date : userData.date,
                description : userData.description,
                jobID : new ObjectID(jobID)
            };
            db.users.insert(doc, null, cb);
        }
        ],
        function (err, result) { // waterfall clean up
            var jsonValue;
            if (err) {
                jsonValue = JSON.stringify({error:"Error Occurred:" + err});
            } else {
                var newUser = result[0];
                var returnData = getClientSideUserObject(newUser);
                jsonValue = JSON.stringify({data: returnData});
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(jsonValue);
        }
    );
}

function handleCreateJob(req, res) {
    console.log('###########  handleCreateJob  #################');
    async.waterfall([
            function (cb) {
                var jobData = req.body;

                var doc = {
                    name:jobData.name,
                    salary:jobData.salary,
                    vacation:jobData.vacation
                };
                db.jobs.insert(doc, null, cb);
            }
        ],
        function (err, result) { // waterfall clean up
            var jsonValue;
            if (err) {
                jsonValue = JSON.stringify({error:"Error Occurred:" + err});
            } else {
                var returnValue = {data:result[0]};
                jsonValue = JSON.stringify(returnValue);
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(jsonValue);
        }
    );
}

function handleUpdateJob(req, res) {
    console.log('###########  handleUpdateJob  #################');
    async.waterfall([
        function (cb) { // Find the ID from the request URL
            var url = req.url;
            var idx = url.lastIndexOf('/');
            var id = url.slice(idx + 1);
            var jsonData = req.body;
            var keysArray = Object.keys(jsonData);
            // Create an update object based on the passed in JSON data
            var updateObject = {};
            for (i = 0; i < keysArray.length; i++) {
                var key = keysArray[i];
                updateObject[key] = jsonData[key];
            }
            cb(null, id, updateObject);
        },
        function (id, updateObject, cb) { // Update the database
            db.jobs.findAndModify(
                {_id: new ObjectID(id)}, // query
                [['_id','asc']],  // sort order
                {$set: updateObject},// replacement, replaces only the specified fields
                {new:true}, // options
                function(err, job) {
                    if (err){
                        console.log('!!!!!!!!!! ERROR:\n'  + err.message);  // returns error if no matching object found
                        cb(err);
                    } else {
                        cb(null, job);
                    }
                });
        },
        function (job, cb) {
            console.log('\nwaterfall 2 user=' + JSON.stringify(job));
            cb(null, job);
        }
      ],
        // waterfall cleanup function
        function (err, results) {
            console.log('\nWATERFALL CLEANUP results:' + JSON.stringify(results));
            var jsonValue = JSON.stringify(results);
            if (err) {
                console.log("!!!!!  There was an error: ");
                console.log(err);
                jsonValue = JSON.stringify({error:"Error Occurred:" + err});
            } else {
                console.log("All operations completed without error.");
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(jsonValue);
        }
    );
}

function handleUpdateUser(req, res) {
    console.log('###########  handleUpdateUser  #################');

    async.waterfall([
        function (cb) { // Find the ID from the request URL
            var url = req.url;
            var idx = url.lastIndexOf('/');
            var id = url.slice(idx + 1);
            var jsonData = req.body;
            var keysArray = Object.keys(jsonData);
            // Create an update object based on the passed in JSON data
            var updateObject = {};
            for (i = 0; i < keysArray.length; i++) {
                var key = keysArray[i];
                if (key === "jobID") {
                    var objectId = new ObjectID(jsonData[key]);
                    updateObject[key] = objectId;
                } else {
                    updateObject[key] = jsonData[key];
                }
            }
            cb(null, id, updateObject);
        },
        function (id, updateObject, cb) { // Update the database
           db.users.findAndModify(
                  {id: id}, // query
                  [['_id','asc']],  // sort order
                  {$set: updateObject},// replacement, replaces only the specified fields
                  {new:true}, // options
                  function(err, user) {
                      if (err){
                          console.log('!!!!!!!!!! ERROR:\n'  + err.message);  // returns error if no matching object found
                          cb(err);
                      } else {
                          console.log('\nMONGODB UPDATED OBJECT\n\n' + JSON.stringify(user));
                          cb(null, user);
                      }
                  });
        },
        function (user, cb) {
            console.log('\nwaterfall 2 user=' + JSON.stringify(user));
            cb(null, getClientSideUserObject(user));
        }

        ],
        // waterfall cleanup function
        function (err, results) {
            console.log('\nWATERFALL CLEANUP results:' + JSON.stringify(results));
            var jsonValue = JSON.stringify(results);
            if (err) {
                console.log("!!!!!  There was an error: ");
                console.log(err);
                jsonValue = JSON.stringify({error:"Error Occurred:" + err});
            } else {
                console.log("All operations completed without error.");
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(jsonValue);
        }
    );
}

/**
 * Returns a User object that is expected by the client. It has a job property that has both the job  ID and name specified
 * @param user - User object returned from the MongoDB 'users' collection
 * @returns {{id: *, name: *, title: *, description: *, date: (*|string|string|string|i), job: {id: (*|jobID), name: *}}}
 */
function getClientSideUserObject(user) {
    return {
        id: user.id,
        name: user.name,
        title: user.title,
        description: user.description,
        date: user.date,
        job: {id: user.jobID, name:db.jobIDToNameMap[user.jobID]},
        citizen : user.citizen
    };
}

function handleGetUsers(req, res) {
    console.log('#############  handleGetUsers  ###############\n');

    var pageSize = parseInt(req.query.pageSize);
    var startPage = parseInt(req.query.startPage);
    if (isNaN(startPage)) {
        startPage = 1;
    }
    if (isNaN(pageSize)) {
        pageSize = 5;
    }
    var numUsers;

    // db.users is a mongodb collection object
    async.waterfall([
            function(cb) {
                db.users.count(cb);
            },
            function (totalUsers, cb) {
                numUsers = totalUsers;
                //db.users.find().toArray(cb); // callback looks like function(err, users)
                //db.users.find().sort({name:1}).toArray(cb); // callback looks like function(err, users)
                var skip = 0;
                if (startPage > 1) {
                    skip = (startPage - 1) * pageSize;
                }
                db.users.find().sort({name:1}).skip(skip).limit(pageSize).toArray(cb); // callback looks like function(err, users)
            },
            function(users, cb) { // Create some new user objects that contain the human displayable name for the job
                var usersData = [];
                for (var i = 0; i < users.length; i++) {
                    var user = users[i];
                    var userObj = getClientSideUserObject(user);
                    usersData.push(userObj);
                }
                cb(null, usersData);
            },
            function (userData, cb) {
                //var jsonString = JSON.stringify(userData);
                var obj = { totalUsers:numUsers,
                            users: userData
                };
                var jsonString = JSON.stringify(obj);
                cb(null, jsonString);
            }
        ],
        // waterfall cleanup function
        function (err, resultJSON) {
            if (err) {
                console.log("Aw, there was an error: ");
                console.log(err);
                resultJSON = JSON.stringify({error:"Error Occurred:" + err});
            } else {
                console.log("All operations completed without error.");
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(resultJSON);
        }
    );
}

function handleGetUsersDataTable(req, res) {
    console.log('#############  handleGetUsersDataTable  ###############\n');

    // db.users is a mongodb collection object
    async.waterfall([
            function (cb) {
                //db.users.find().toArray(cb); // callback looks like function(err, users)
                db.users.find().sort({name:1}).toArray(cb); // callback looks like function(err, users)
            },
            function(users, cb) { // Create some new user objects that contain the human displayable name for the job
                var usersData = [];
                for (var i = 0; i < users.length; i++) {
                    var user = users[i];
                    var userObj = {
                        name: user.name,
                        title: user.title,
                        job: db.jobIDToNameMap[user.jobID],
                        date: user.date,
                        description: user.description,
                        citizen : user.citizen
                    };
                    usersData.push(userObj);
                }
                cb(null, usersData);
            },
            function (userData, cb) {
                var obj = {
                    data : userData
                };
                var jsonString = JSON.stringify(obj);
                cb(null, jsonString);
            }
        ],
        // waterfall cleanup function
        function (err, resultJSON) {
            if (err) {
                console.log("Aw, there was an error: ");
                console.log(err);
                resultJSON = JSON.stringify({error:"Error Occurred:" + err});
            } else {
                console.log("All operations completed without error.");
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(resultJSON);
        }
    );
}

function handleGetJobs(req, res) {
    console.log('#############  handleGetJobs ##############\n');

    // db.jobs is a mongodb collection object
    async.waterfall([
        function (cb) {
            db.jobs.find().sort({name:1}).toArray(cb); // callback format is  function(err, jobs)
        },
        function (jobs, cb) {
            console.log("\nDumping jobs:");
            for (var i = 0; i < jobs.length; i++) {
                var job = jobs[i];
                var text = "Job: " + job.name;
                console.log(text);
            }

            var jsonString = JSON.stringify(jobs);
            cb(null, jsonString);
        }

        ],
        // waterfall cleanup function
        function (err, jsonString) {
            if (err) {
                console.log("Aw, there was an error: ");
                console.log(err);
                jsonString = JSON.stringify({error:"Error Occurred:" + err});
            } else {
                console.log("All operations completed without error.");
            }
            res.writeHead(200, {'Content-Type': "application/json"});
            res.end(jsonString);
        }
    );
}

function serve_static_file(file, res) {
    var rs = fs.createReadStream(file);
    rs.on(
        'error',
        function (e) {
            res.writeHead(404, { "Content-Type" : "application/json" });
            var out = { error: "not_found",
                        message: "'" + file + "' not found" };
            res.end(JSON.stringify(out) + "\n");
            return;
        }
    );
    var ct = content_type_for_file(file);
    res.writeHead(200, { "Content-Type" : ct });
    rs.pipe(res);
}

function content_type_for_file (file) {
    var ext = path.extname(file);
    switch (ext.toLowerCase()) {
        case '.html': return "text/html";
        case ".js": return "text/javascript";
        case ".css": return 'text/css';
        case '.jpg': case '.jpeg': return 'image/jpeg';
        case '.json': return 'application/json';
        default: return 'text/plain';
    }
}

function make_error(err, msg) {
    var e = new Error(msg);
    e.code = err;
    return e;
}

function send_success(res, data) {
    res.writeHead(200, {"Content-Type": "application/json"});
    var output = { error: null, data: data };
    res.end(JSON.stringify(output) + "\n");
}


function send_failure(res, code, err) {
    var code = (err.code) ? err.code : err.name;
    res.writeHead(code, { "Content-Type" : "application/json" });
    res.end(JSON.stringify({ error: code, message: err.message }) + "\n");
}


function invalid_resource() {
    return make_error("invalid_resource",
                      "the requested resource does not exist.");
}

function four_oh_four(req, res) {
    send_failure(res, 404, invalid_resource());
}

function send_failure(res, code, err) {
    var code = (err.code) ? err.code : err.name;
    res.writeHead(code, { "Content-Type" : "application/json" });
    res.end(JSON.stringify({ error: code, message: err.message }) + "\n");
}


db.init(function (err, results) {
    console.log('db.init  callback done!');
    if (err) {
        console.error("!!!!!!!!!!! DATABASE ERROR ON STARTUP: ");
        console.error(err);
        console.error("!!!!!!!!!!! DATABASE WILL NOT BE AVAILABLE   !!!!!!!!!!!!!!!!!!!!!!!! ");
    }
});

app.listen(app.get('port'), function() {
    console.log('\n\nServer up: http://localhost:' + app.get('port'));
    console.log('\n\n');
});