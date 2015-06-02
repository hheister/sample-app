define(['jquery', 'knockout', 'koTemplateEngine', 'bootstrap', 'oLoader', 'globalize', 'koBindings'],
    function($, ko, koTemplateEngine, bootstrap, oLoader, globalize, koBindings) {

var vm = (function () {
    "use strict";
    var self = this;
    var selectedUser = ko.observable();
    var selectedJob = ko.observable();
    var mainTabVisible = ko.observable(true);
    var welcomePageVisible = ko.observable(false);

    var users = ko.observableArray([]);
    var jobs = ko.observableArray([]);
    var jobDialog;
    var userPageInfo = {
        pageSize:ko.observable(3),
        numPages:ko.observable(3),
        startPage:ko.observable(1)
    };

    var showPreviousButton = ko.computed(function() {
        return userPageInfo.startPage() > 1;
    });

    var showNextButton = ko.computed(function() {
        return userPageInfo.startPage() < (userPageInfo.numPages());
    });

    var usersTablePageInfoText = ko.computed(function() {
        return "Page " + userPageInfo.startPage() + " of " + userPageInfo.numPages();
    });

    var getJobIDForName = function(name) {
        for (var i = 0; i < jobs().length; i++) {
            var job = jobs()[i];
            if (job.name === name) {
                return job.id;
            }
        }
        return null;
    };

    var getJobNames = function () {
        var jobNames = [];
        for (var i = 0; i < jobs().length; i++) {
            var job = jobs()[i];
            jobNames.push(job.name);
        }
        return jobNames;
    };

    var showProgressBar = function (value) {
        if (value) {
            $("#splitter").oLoader(
                {
                    backgroundColor: '#000',
                    fadeInTime: 500,
                    fadeOutTime: 1000,
                    fadeLevel: 0.5,
                    image: './js/vendors/oLoader/images/ownageLoader/loader1.gif'
                }
            );
        } else {
            $("#splitter").oLoader('hide');
        }
    };

    var showPage = function (page) {
        if (page == "welcome_page") {
            mainTabVisible(false);
            welcomePageVisible(true);
        } else if (page == "tab_page") {
            mainTabVisible(true);
            welcomePageVisible(false);
        }
    };

    var loadUsers = function() {
        showProgressBar(true);
        var serverURL = './sampleapp/users?pageSize=' + userPageInfo.pageSize() + '&startPage=' + userPageInfo.startPage();
        console.log(serverURL);
        $.ajax({
            url: serverURL,
            type: 'GET',
            contentType: 'application/json'
        }).success(function(data) {
            users.removeAll();
            // Data comes back in JSON with 'totalUsers' key having the total # users in DB
            // The 'users' key will have the users for this page
            var totalUsers = parseInt(data.totalUsers);
            var numberPages = 1;
            if (totalUsers > userPageInfo.pageSize()) {
                numberPages = Math.ceil(totalUsers / userPageInfo.pageSize());
            }
            if (numberPages != userPageInfo.numPages()) {
                userPageInfo.numPages(numberPages);
            }
            //console.log('totaluser:' + data.totalUsers);
            //console.log('numberPages:' + numberPages);
            // data is an array of javascript objects
            for (var i = 0; i < data.users.length; i++) {
                try {
                    var dataObj = data.users[i];
                    var id = dataObj.id;
                    var name = dataObj.name;
                    var title = dataObj.title;
                    var date = dataObj.date;
                    var description = dataObj.description;
                    var jobName = dataObj.job.name;
                    var jobID = dataObj.job.id;
                    var citizen = dataObj.citizen;
                    var ro = createUserRowData(id, name, title, date, description, jobName, jobID, citizen);
                    // Subscribe to when the citizenship is changed by the user in the table. We will update the server then
                    ro.citizen.subscribe(function(newValue) {
                        console.log('subscribe newValue=' + newValue);
                        updateUserCitizenShip(this, newValue);
                    }, ro);
                    users.push(ro);
                } catch (err) {
                    console.log(err);
                }
            }
        }).done(function(data) {
            showProgressBar(false);
        });
    };

    var updateUserCitizenShip = function(user, isCitizen){
        //alert('updateUserCitizenShip:  user.name=' + user.name() + '  isCitizen:' + isCitizen);
        var DataToSend = {
            'citizen': isCitizen
        };
        updateUser(user.id, DataToSend);
    };

    var showUserCreationDialog = function() {
        var rowObject = createUserRowData("id", "Name", "Title", new Date().toLocaleString(), "Description", "Executive", null, false);
        selectedUser(rowObject);
        $('#create-user-modal').modal('show');
    };

    var createUser = function() {
        var newUser = {
            name : selectedUser().name(),
            jobName: selectedUser().jobName(),
            title : selectedUser().title(),
            description : selectedUser().description(),
            date : selectedUser().date(),
            citizen : true
        };
        var url = "./sampleapp/users";
        $.ajax({
            type: "POST",
            url: url,
            data: newUser,
            success: function(result) {
                if (result.error) {
                    alert(result.error);
                } else if (result.data) {
                    var newUser = result.data;
                    var ro = createUserRowData(newUser.id,
                        newUser.name,
                        newUser.title,
                        newUser.date,
                        newUser.description,
                        newUser.job.name,
                        newUser.job.id,
                        newUser.citizen);
                    users.push(ro);
                    $('#create-user-modal').modal('hide');
                }
            },
            error : function(data) {
                alert('ERROR:' + data);
            }
        });
    }

    function cancelCreateUserDialog() {
        $('#create-user-modal').modal('hide');
    }

    function createUserRowData(id, name, title, date, desc, jobName, jobID, citizen) {
        var obj =  {
            "id" : id,
            "jobName": ko.observable(jobName),
            "jobID": jobID,
            "name": ko.observable(name), 
            "title": ko.observable(title), 
            "date": ko.observable(date), 
            "description": ko.observable(desc),
            "citizen": ko.observable(citizen)
        };
        return obj;
    };

    var deleteUser = function(user) {
        var id = user.id;
        var url = "./sampleapp/user/" + id;
        // Delete from the database
        $.ajax({
            type: "DELETE",
            url: url,
            success: function(data) {
                // data contains the JSON with the user object returned from the database after the update
                if (data.result != null && data.result === true) {
                    users.remove(user);
                } else if (data.error) {
                    alert(data.error);
                }
            },
            error : function(data) {
                alert('ERROR:' + data);
            }
        });
    };

    var editUser = function (user) {
        try {
            // create a clone of the user for use in the dialog
            var clone = createUserRowData(user.id,
                user.name(),
                user.title(),
                user.date(),
                user.description(),
                user.jobName(),
                user.jobID,
                user.citizen());
            // Set the selected job as the one that the user has
            for (var i = 0; i < jobs().length; i++) {
                var job = jobs()[i];
                if (clone.jobName() === job.name) {
                    selectedJob(job);
                    //theSelectedJob = job;
                    break;
                }
            }
            // Set the selected user to the clone so the Edit dialog will use it for the model
            selectedUser(clone);

            $('#edit-user-modal').modal('show');
        } catch (err) {
            console.log(err);
        }
    };

    var cancelEditUser = function (user) {
        $('#edit-user-modal').modal('hide');
    };

    var updateUser = function(userID, DataToSend) {
        // Find the user in the users array with the same ID, we will update it after the server responds
        var target = null;
        for (var i = 0; i < users().length; i++) {
            var item = users()[i];
            if (item.id === userID) {
                target = item;
                break;
            }
        }

        showProgressBar(true);
        // Update the user on the server
        var url = "./sampleapp/user/" + userID;

        // Update the database with the new values
        $.ajax({
            type: "PUT",
            url: url,
            contentType: "application/json",
            data: JSON.stringify(DataToSend)
        }).success(function(data) {
            if (data.error) {
                alert(data.error);
                return;
            }
            // data contains the JSON with the user object returned from the database after the update
            // alert('SUCCESS:' + JSON.stringify(data));
            // Update the UI user with the values returned from the server
            if (target != null) {
                var propNames = Object.keys(DataToSend);
                for (var j = 0; j < propNames.length; j++) {
                    var propertyName = propNames[j];
                    var serverValue = data[propertyName];
                    var targetValue = target[propertyName];
                    var isObservableProperty = ko.isObservable(targetValue);
                    if (isObservableProperty) {
                        target[propertyName](serverValue);
                    } else {
                        target[propertyName] = serverValue;
                    }
                    /*if (propertyName === "citizen") {
                        target.citizen(serverValue);
                    }*/
                }
            }
            // Hide the dialog
            $('#edit-user-modal').modal('hide');
        }).error(function(data) {
            alert('ERROR:' + data);
        }).done(function(data) {
            showProgressBar(false);
        });
    };

    var saveUser = function (user) {
        // Find the user in the users array with the same ID
        var target = null;
        var id = user.id;
        for (var i = 0; i < users().length; i++) {
            var item = users()[i];
            if (item.id === id) {
                target = item;
                break;
            }
        }
        showProgressBar(true);
        // Update the user on the server
        var url = "./sampleapp/user/" + id;
        var DataToSend = {  
                "name" : user.name(),
                "title" : user.title(),
                "date": user.date(),
                "description": user.description(),
                "citizen": user.citizen()
             };
        var jobID = getJobIDForName(user.jobName());
        if (jobID != null) {
            DataToSend.jobID = jobID;
        }
        // Update the database with the new values
        $.ajax({ 
            type: "PUT",
            url: url,
            contentType: "application/json",
            data: JSON.stringify(DataToSend)
        }).success(function(data) {
            // data contains the JSON with the user object returned from the database after the update
           // alert('SUCCESS:' + JSON.stringify(data));
            // Update the UI user with the values returned from the server
            if (target != null) {
                target.name(data.name);
                target.title(data.title);
                target.date(data.date);
                target.jobName(data.job.name);
                target.jobID = data.job.id;
                target.description(user.description());
                target.citizen(user.citizen());
            }
            // Hide the dialog
            $('#edit-user-modal').modal('hide');
        }).error(function(data) { 
            alert('ERROR:' + data);
        }).done(function(data) {
            showProgressBar(false);
        });
    };

    var loadJobs = function() {
        showProgressBar(true);
        $.ajax({
            url: './sampleapp/jobs',
            type: 'GET',
            contentType: 'application/json'
        }).success(function(data) {
            jobs.removeAll();
            // data is an array of javacript objects
            for (var i = 0; i < data.length; i++) {
                try {
                 var id = data[i]._id;
                 var name = data[i].name;
                 var salary = data[i].salary;
                 var vacation = data[i].vacation;
                 var ro = createJobRowData(id, name, salary, vacation);
                 jobs.push(ro);
                } catch(err) {
                    console.log(err);
                }
            }
        }).done(function(data) {
            showProgressBar(false);
        });
    };

    function createJobRowData (id, name, salary, vacation) {
        return {
            "id" : id,
            "name": name,
            "salary": ko.observable(salary), 
            "vacation": ko.observable(vacation)
        };
    };

    var cancelCreateJob = function() {
        $('#create-job-modal').modal('hide');
    };

    var createJob = function() {
        var newJob = {
            name : selectedJob().name,
            salary : selectedJob().salary(),
            vacation : selectedJob().vacation()
        };
        var url = "./sampleapp/jobs";
        $.ajax({
            type: "POST",
            url: url,
            data: newJob,
            success: function(result) {
                if (result.error) {
                    alert(result.error);
                } else if (result.data) {
                    //alert(JSON.stringify(result.data));
                    var newJob = result.data;
                    var ro = createJobRowData(newJob.id, newJob.name, newJob.salary, newJob.vacation);
                    jobs.push(ro);
                    $('#create-job-modal').modal('hide');
                }
            },
            error : function(data) {
                alert('ERROR:' + data);
            }
        });
    };

    var editJob = function (job) {
        try {
            // create a clone of the job for use in the dialog
            var clone = createJobRowData(job.id, job.name, job.salary(), job.vacation());
            selectedJob(clone);
            var spinner = $( "#salarySpinner" ).spinner();
            /*var spinner = $( "#salarySpinner" ).spinner({
                min: 10000,
                max: 200000000,
                step: 10000,
                start: job.salary,
                numberFormat: "C"
            });*/
            if (jobDialog) {
                jobDialog.dialog("open");
                return;
            }


            jobDialog = $( "#edit-job-dialog" ).dialog({
                autoOpen: false,
                height: 400,
                width: 420,
                modal: true,
                buttons: {
                    "Save": function() {
                        saveJob(selectedJob());
                    },
                    Cancel: function() {
                        jobDialog.dialog( "close" );
                    }
                },
                close: function() {

                }
            });
            jobDialog.dialog("open");
        } catch (err) {
            console.log(err);
        }
    };

    var saveJob = function (job) {
        // Find the user in the users array with the same ID
        var target = null;
        var id = job.id;
        for (var i = 0; i < jobs().length; i++) {
            var item = jobs()[i];
            if (item.id === id) {
                target = item;
                break;
            }
        }

        // Update the job on the server
        var url = "./sampleapp/job/" + id;
        var DataToSend = {
            "name" : job.name,
            "vacation" : job.vacation(),
            "salary": job.salary()
        };

        // Update the database with the new values
        $.ajax({
            type: "PUT",
            url: url,
            contentType: "application/json",
            data: JSON.stringify(DataToSend)
        }).success(function(data) {
            // data contains the JSON with the user object returned from the database after the update
            // alert('SUCCESS:' + JSON.stringify(data));
            // Update the UI user with the values returned from the server
            if (target != null) {
                target.name = data.name;
                target.vacation(data.vacation);
                target.salary(data.salary);
            }
            // Hide the dialog
            jobDialog.dialog( "close" );
        }).error(function(data) {
            alert('ERROR:' + data);
        });
    };

    var deleteJob = function (job) {
        var id = job.id;
        var url = "./sampleapp/job/" + id;
        // Delete from the database
        $.ajax({
            type: "DELETE",
            url: url,
            success: function(data) {
                // data.result is true if job was deleted
                if (data.result != null && data.result === true) {
                    jobs.remove(job);
                } else if (data.error) {
                    alert(data.error);
                }
            },
            error : function(data) {
                alert('ERROR:' + data);
            }
        });
    };

    var addJob = function () {
        var ro = createJobRowData("id", "Enter Job", "Enter Salary", "Enter Vacation");
        selectedJob(ro);
        $('#create-job-modal').modal('show');
    };

    var cancelEditJob = function (job) {
        try{
            $('#edit-job-modal').modal('hide');
        } catch(err) {
            console.log(err);
        }
    };

    var activate = function () {
        ko.applyBindings(vm);
    };

    var showUserDatePicker = function(user) {
        var currentDate = user.date();
        var onSelect = function(selectedDate) {
            //user.date(selectedDate);
            var data = {date: selectedDate};
            updateUser(user.id, data);
        };
        $( "#datepicker" ).datepicker( "dialog", currentDate, onSelect);
    };

    var previousUsersPage = function() {
        userPageInfo.startPage(userPageInfo.startPage() - 1);
        loadUsers();
    };

    var nextUsersPage = function() {
        userPageInfo.startPage(userPageInfo.startPage() + 1);
        loadUsers();
    };


    return {
        showNextButton: showNextButton,
        showPreviousButton:showPreviousButton,
        usersTablePageInfoText: usersTablePageInfoText,
        nextUsersPage:nextUsersPage,
        previousUsersPage: previousUsersPage,
        showUserDatePicker:showUserDatePicker,
        getJobNames: getJobNames,
        showProgressBar: showProgressBar,
        users:users,
        jobs:jobs,
        loadJobs:loadJobs,
        addJob:addJob,
        createJob: createJob,
        cancelCreateJob: cancelCreateJob,
        editJob:editJob,
        deleteJob: deleteJob,
        selectedJob:selectedJob,
        saveJob:saveJob,
        cancelEditJob:cancelEditJob,
        loadUsers:loadUsers,
        createUser:createUser,
        showUserCreationDialog:showUserCreationDialog,
        editUser:editUser,
        saveUser:saveUser,
        cancelEditUser:cancelEditUser,
        cancelCreateUserDialog : cancelCreateUserDialog,
        deleteUser: deleteUser,
        selectedUser:selectedUser,
        activate: activate,
        welcomePageVisible: welcomePageVisible,
        mainTabVisible : mainTabVisible,
        showPage : showPage,
    };
})();

$( document ).ajaxError(function(event,response) {
    console.error(response);
    alert("Error in the communication. Check the console!");
});

// ko External Template Settings
infuser.defaults.templateSuffix = ".html";
infuser.defaults.templateUrl = "./templates";

//alert('infuser.defaults.templateUrl=' + infuser.defaults.templateUrl);
vm.activate();

return vm;

});