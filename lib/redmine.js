console.log("»»»»»redmine load««««««");
var redmine ={},
    Redmine = require('./redmine-rest.js'),
    bcrypt = require('bcrypt'),
    mongoose = require('mongoose'),
    textile = require('stextile'),
    config = require('./config');
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

require('./models.js')
Schema = mongoose.Schema;


var User = mongoose.model('User');
var Issue = mongoose.model('Issue');
var Project = mongoose.model('Project');
var SkUser = mongoose.model('SkUser');
var SkProject = mongoose.model('SkProjects');
var SkIssue = mongoose.model('SkIssues');

var db = mongoose.connect(config.mongo.host);

var redmineRest = new Redmine({
    host: config.redmine.host,
    apiKey: config.redmine.apiKey
});

redmine.init = function() {
    //this.sync( function() {} );
    redmine.syncIssues();
};

redmine.io = function(socket) {
    //io.sockets.on('connection', function(socket){
        /*
         *redmine.getUserIssues( function(err, data) {
         *    socket.emit('getUserIssues::response', data);
         *});
         */

        socket.emit('redmine::connect');

        socket.on('redmine::sync', function(data){
            redmine.sync( function(err, data) {
                //socket.emit('redmine::response', data);
            });
            //socket.broadcast.emit('server_message',data);
            //socket.emit('server_message',data);
        });

        socket.on('getDatabaseState', function(){
            socket.emit('databaseState', {state: mongoose.connection.readyState});
        });

        socket.on('setUsersIssues', function(){
            redmine.setUsersIssues( function(err, data) {
                //socket.emit('redmine::response', data);
                socket.emit('log', data);
            });
        });
        socket.on('getUsers', function(){
            redmine.getUsers( function(err, data) {
                socket.emit('getUsers::response', data);
            });
        });

        socket.on('redmine::getUserIssues', function(id, callback){
            id = id.split('_')[1];
            socket.emit('log', id);
            redmine.getUserIssues( id, function(err, data) {
                //socket.emit('getUserIssues::response', data);
                callback(data);
            });
        });

        socket.on('setSkProjects', function(){
            console.log("setSkProjects : ");
            redmine.setSkProjects( function(err, data) {
                //socket.emit('redmine::response', data);
                socket.emit('log', data);
            });
        });
        socket.on('getSkProjects', function(){
            redmine.getSkProjects( function(err, data) {
                socket.emit('getSkProjects::response', data);
                //socket.emit('log', data);
            });
        });

        socket.on('getIssues', function(callback){
            redmine.getIssues( function(err, data) {
                socket.emit('getIssues::response', data);
                //socket.emit('log', data);
                callback(data);
            });
        });

        socket.on('redmine::getIssue', function(id, callback){
            redmine.getIssue( id, function(err, data) {
                //socket.emit('getIssues::response', data);
                //socket.emit('log', data);
                callback(data);
            });
        });

        socket.on('redmine::getCompleteIssue', function(id, callback){
            //id = id.split('_')[1];
            //callback([{name: id}]);
            socket.emit('log', id);

            redmine.getCompleteIssue( id, function(err, data) {
                socket.emit('log', data);
                callback(data);
            });
        });
        socket.on('syncIssues', function(){
            console.log("PUUUUUTE : ");
            redmine.syncIssues();
        });
        emitter.on('createIssue', function(issue){
            socket.emit('createIssue', issue);
        });
        emitter.on('updateIssue', function(issue){
            socket.emit('updateIssue', issue);
        });
        emitter.on('log', function(data){
            socket.emit('log', data);
        });
    //});
};

redmine.sync = function( callback ) {
    console.log("===> redmine.js : synch");
    redmine.getAllProjects( callback );
    redmine.getAllUsers( callback );
    redmine.getAllIssues( callback );

    //redmine.getAll( 'projects', callback);
    //redmine.getAll( 'users', callback);
    //redmine.getAll( 'issues', callback);
};

redmine.getAll = function( itemModel, type, callback) {
    console.log("===> redmine.js : getAllProjects");

    //var itemModel = db.model(type, itemSchema);
    itemModel.collection.drop();

    var itemsCount;
    var lastItem = 0;
    var itemsList = [];

    var getAllItems = function() {
        console.log("lastItem : ", lastItem);
        console.log("itemsCount : ", itemsCount);
        if (lastItem === itemsCount) {
            callback( null, itemsList );
            //mongoose.connection.close();
            return;
        }

        redmineRest.getItems(type, {limit: 100, offset: lastItem}, function(err, data) {
            if (err) {
                console.log("error : ", err.message);
                return;
            }
            itemsCount = data.total_count;

            var items = data[type];
            //console.log("items : ", items);
            var loopCount = items.length;
            for (var i = 0; i < loopCount; i++) {
                lastItem++;
                itemsList.push( items[i] );
                //console.log("items[i]['id'] : ", items[i]['id']);

                var item = new itemModel( items[i] );
                item.redmine_id = items[i]['id'];
                item.type_id = type + '_' + items[i]['id'];
                console.log("item : ", item);
                //item.redmine_id = 'rstrstnrstnrstnrstnrstnrst';
                //item.commit('any');
                item.save();
            }
            //socket.emit('log', type + ':' + lastItem + '/' + itemsCount);
            getAllItems();
        });
    };
    getAllItems();
    return;
};

redmine.getAllIssues = function( callback ) {
    redmine.getAll(Issue, 'issues', callback);
    //redmine.getAll(Issues, 'Issue', callback);
};

redmine.getAllUsers = function( callback ) {
    redmine.getAll(User, 'users', callback);
    //redmine.getAll(Users, 'User', callback);
};


redmine.getAllProjects = function( callback ) {
    redmine.getAll(Project, 'projects', callback);
    //redmine.getAll(Projects, 'Project', callback);
};


redmine.getCompleteIssue = function( id, callback ) {
    redmineRest.getIssueParams(id, {include: 'journals'}, function(err, data) {
        var journals = [];
        var loopCount = data.issue.journals.length;
        for (var i = 0; i < loopCount; i++) {
            //data.issue.journals[i].notes = textile(data.issue.journals[i].notes);
        }
        delete loopCount;
        //callback(err, journals);
        callback(err, data);
    });
    //redmine.getAll(Projects, 'Project', callback);
};

redmine.setUsersIssues = function( callback ) {

    SkUser.collection.drop();

    User.where('mail')
        .$regex('@internethic')
        .each(function(err, doc) {
            if (doc) {
                //callback( null, assignedIssues );
                var skUser = new SkUser({
                    id: doc.id,
                    type_id: doc.type_id,
                    current: doc.current,
                    login: doc.login,
                    name: doc.firstname + ' ' + doc.lastname,
                    redmine: {
                        login: doc.login,
                        firstname: doc.firstname,
                        lastname: doc.lastname
                    }
                });

                console.log("doc.lastname : ", doc.lastname);
                console.log("doc.firstname : ", doc.firstname);

                //Issue.find({ 'assigned_to.name': doc.firstname + ' ' + doc.lastname }, function (err, docs) {
                //Issue.find({ 'assigned_to.name': doc.firstname + ' ' + doc.lastname })
                //Issue.find({ 'assigned_to.name': doc.firstname + ' ' + doc.lastname }, ['id', 'type_id', 'subject', 'priority', 'project'])
                Issue.find({ 'assigned_to.name': doc.firstname + ' ' + doc.lastname }, ['id'])
                    .sort('priority.id', -1, 'project.name', 1)
                    .run(function (err, docs) {
                        //callback( null, docs );
                        skUser.redmine.issues = docs;
                        skUser.redmine.issuesCount = docs.length;
                        console.log("docs : ", docs);
                        skUser.save();
                });
            }
        });
};

redmine.getUsers= function( callback ) {
    SkUser.find({  }, function (err, docs) {
        callback(null, docs);
    });
};

redmine.getUserIssues = function( id, callback ) {
    //callback(null, id);
    SkUser.findOne({id: id}, function (err, doc) {
            //socket.emit('log', doc);
            emitter.emit('log', doc);
        //Issue.find({ 'assigned_to.name': doc.redmine.firstname + ' ' + doc.redmine.lastname }, ['id', 'type_id', 'subject', 'priority', 'project'])
        Issue.find({ 'assigned_to.name': doc.redmine.firstname + ' ' + doc.redmine.lastname })
            .sort('priority.id', -1, 'project.name', 1)
            .run(function (err, docs) {
                callback( err, docs );
                //socket.emit('log', docs);
                emitter.emit('log', docs);
                //skUser.redmine.issues = docs;
                //skUser.redmine.issuesCount = docs.length;
                console.log("docs : ", docs);
                //skUser.save();
        });
    });
};

redmine.getIssues = function( callback ) {
    Issue.find({}, function (err, docs) {
        //doc.description = textile(doc.description);
        callback(null, docs);
    });
};

redmine.getIssue = function( id, callback ) {
    Issue.findOne({ type_id: id  }, function (err, doc) {
        //doc.description = textile(doc.description);
        callback(null, doc);
    });
};

redmine.setSkProjects = function( callback ) {

    SkProject.collection.drop();

    Project.find().each(function(err, doc) {
        console.log("err : ", err);
        console.log("doc : ", doc);
        if (doc) {
            //callback( null, assignedIssues );
            var skProject = new SkProject({
                id: doc.id,
                created_on: doc.created_on,
                description: doc.description,
                updated_on: doc.updated_on,
                identifier: doc.identifier,
                name: doc.name
            });

            console.log( doc.id,  " : ", doc.name);
            //skProject.save();

            Issue.find({ 'project.id': doc.id }, function (err, docs) {
                //callback( null, docs );
                if (docs.length) {
                    skProject.issues = docs;
                    skProject.save();
                }
            });
        }
    });
};

redmine.getSkProjects = function( callback ) {
    SkProject.find({  }, function (err, docs) {
        callback(null, docs);
    });
};

redmine.syncIssues = function() {
    var checkLastIssue = function(offset) {
        console.log(" ========== »»»» checkLastIssue : ");
        offset = offset || 0;
        redmineRest.getIssues({limit: '1', sort: 'updated_on:desc', offset: offset}, function(err, data) {
            var lastRedmineDate = new Date(data.issues[0].updated_on);
            var redmineIssue = data.issues[0];
            Issue.findOne({ 'id': data.issues[0].id }, function (err, doc) {
                if (doc) {
                    var lastMongoDate = new Date(doc.updated_on);
                    if (lastRedmineDate > lastMongoDate) {
                        console.log("UPDATE NEEDED : ", redmineIssue.id);
                        updateIssue(redmineIssue);
                        checkLastIssue(++offset);
                    }
                    else {
                        console.log("issue up to date : ", redmineIssue.id);
                        //socket.emit('log', "issue up to date : " + redmineIssue.id);
                    }
                }
                else {
                    console.log("CREATE NEEDED : ", redmineIssue.id);
                    createIssue(redmineIssue);
                    checkLastIssue(++offset);
                }
            });
        });
    };
    checkLastIssue();
    setInterval(checkLastIssue, 10 * 1000);

    var createIssue = function(redmineIssue) {
        console.log("creating issue : ");
        var issue = new Issue(redmineIssue);
        issue.save();
        //socket.emit('createIssue', issue);
        emitter.emit('createIssue', issue);
    };

    var updateIssue = function(redmineIssue, callback) {
        console.log("updating issue : ", redmineIssue.id);
        Issue.remove({id: redmineIssue.id}, function() {
            var issue = new Issue(redmineIssue);
            issue.save();
            //socket.emit('updateIssue', issue);
            emitter.emit('updateIssue', issue);
        });
        /*
         *Issue.update({id: redmineIssue.id}, redmineIssue, {}, function(err, numAffected) {
         *}).run(function(err, doc) {
         *    Issue.findOne({ 'id': redmineIssue.id }, function (err, issue) {
         *        socket.emit('updateIssue', issue);
         *    });
         *});
         */
    };
};

module.exports = redmine;
