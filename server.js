// dependancies 
var restify = require('restify');
//var fs = require('fs');

// local includes
var routes = require('./views/routes.js');
var extras = require('./views/extras.js');
var auth = require('./views/auth.js');
var replies = require('./views/responses.js');
var db = require('./models/dbcontroller.js').connect();

// server
var server = restify.createServer({
    name: 'Facility Registry api',
    //https support (should use proper ssl cert)
    //key: fs.readFileSync('/etc/ssl/self-signed/server.key'),
    //certificate: fs.readFileSync('/etc/ssl/self-signed/server.crt'),
    version: '0.0.1'
});

// server modules
//server.pre(restify.pre.sanitizePath());
server.pre(restify.pre.userAgentConnection());

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser()); // basic auth
server.use(restify.queryParser());         // gets
server.use(restify.bodyParser());          // sets up body field
server.use(restify.gzipResponse());        // compressed response
server.use(restify.throttle({
            burst: 100,
            rate: 50,
            ip: true,
            //username: true, // can throttle on basic auth username
            overrides: {
                '192.168.1.1': {
                    rate: 0,        // unlimited
                    burst: 0
                }

                //'admin' : { Cant have both ip and user set for throttling 
                //    rate: 0,
                //    burst: 0
                //}
            }
}));

// From conf file
// server.use(function authenticate(req, res, next) {
//     console.log("\nAttempting Login ...")
//     db.lookup(req.username, function (err, password) {
//         if (err) {
//             console.log(">>> Failed to find user.");
//             //return next(new restify.NotFoundError('user not found'));
//             return replies.apiUnauthorized(res, req.username);
//         }

//         // temp dont intend to keep passwords as plain string
//         if (password !== req.authorization.basic.password) {
//             console.log(">>> Failed to auth user pass.");
//             //return next(new restify.NotAuthorizedError());
//             return replies.apiUnauthorized(res, req.username);
//         }
      
//         console.log(">>> User success!");
//         return next();

//      });
// });

// From db
server.use(function authenticate(req, res, next) {
    console.log("\nAttempting Login ...")
    if (req.username == 'anonymous' 
            || typeof req.authorization.basic == 'undefined') {
        return replies.apiUnauthorized(res,"No basic auth information provided");
    }

    db.user.login(req.username, req.authorization.basic.password, function(success) {
        if (!success)
            return replies.apiUnauthorized(res, req.username);
        
        console.log(">>> User success!");
        return next();
    });
});

server.listen(3000, function() {
      console.log('%s listening at %s', server.name, server.url);
});

// paths
var prePath = '/api/v0';
server.get('/hello/:name/', routes.respond);

// When I want to get specfic /^[0-9a-fA-F]{24}$/)

// main
server.get(prePath + "/facilities.json", routes.sites); // all sites
server.post(prePath + "/facilities.json", routes.add); // new site
server.get(/\/api\/v0\/facilities\/([a-z\d]+)\.json/, routes.site); // site by id
server.del(/\/api\/v0\/facilities\/([a-z\d]+)\.json/, routes.del); // delete by id
server.put(/\/api\/v0\/facilities\/([a-z\d]+)\.json/, routes.update); // update site by id

// photos
server.post(prePath+'/facilities/:id/photos', extras.uploadPhoto);
server.get(/\/sites\/photos\/?.*/, restify.serveStatic({
  directory: './public'
}));

// extras
server.get(prePath+'/facilities/near/:lat/:lng/:rad', extras.near); // search near coord
server.get(prePath+'/facilities/within/:swlat/:swlng/:nelat/:nelng/', extras.within); // search within box
server.get(prePath+'/facilities/within/:swlat/:swlng/:nelat/:nelng/:sector', extras.withinSector); // search within box and sector

// users
server.post(prePath+'/users/add/', auth.addUser); // just for testing, should be in admin console
server.post(prePath+'/users/login/', auth.login); // just for testing, done during basic auth
