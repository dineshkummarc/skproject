global.config = require('./lib/config');
//console.log("config : ", config);

//setup Dependencies
var connect = require('connect'),
    express = require('express'),
    io = require('socket.io'),
    mongoose = require('mongoose'),
    port = (process.env.PORT || config.server.port),
    host = (process.env.HOST || config.server.host),
    test = require('./lib/test.js');

//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "shhhhhhhhh!"}));
    server.use(connect.static(__dirname + '/assets'));
    server.use(server.router);
});

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: {
                  title : '404 - Not Found',
                  description: '',
                  author: '',
                  analyticssiteid: 'XXXXXXX'
                },status: 404 });
    } else {
        res.render('500.jade', { locals: {
                  title : 'The Server Encountered an Error',
                  description: '',
                  author: '',
                  analyticssiteid: 'XXXXXXX',
                  error: err
                },status: 500 });
    }
});
server.listen( port, host);

//Setup Socket.IO
var io = io.listen(server);
io.set('log level', 1);

//init lib modules
var redmine = require('./lib/redmine.js');
redmine.init();

var irc = require('./lib/irc.js');
irc.init();

io.sockets.on('connection', function(socket){
    redmine.io(socket);
    irc.io(socket);

    socket.on('disconnect', function(){
        console.log('Client Disconnected.');
    });
});

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/', function(req,res){
  res.render('index-' + config.clientFramework+ '.jade', {
    locals : {
              title : host + ':' + port + ' | skProject | ' + config.clientFramework ,
              description: 'Your Page Description',
              author: 'Your Name',
              analyticssiteid: 'XXXXXXX'
            }
  });
});

server.get('/demo', function(req,res){
  res.render('index_demo.jade', {
    locals : {
              title : 'Your Page Title',
              description: 'Your Page Description',
              author: 'Your Name',
              analyticssiteid: 'XXXXXXX'
            }
  });
});


//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on '+ host + ':' + port );
console.log('Using client framework ' + config.clientFramework );
