var restify = require('restify')

// local includes
var database = require('../models/dbcontroller.js')
var parser = require('../controller/parser.js')
var replies = require('./responses.js');


// echo
var respond = function (req, res, next) {
      res.send('hello ' + req.params.name);
      return next();
}

// views
var sites = function (req, res, next) {
    console.log("\n>>> Finding all sites params", req.params);
    
    // parse query
    query = parser.parseParams(req.params, database.SiteModel)

    query.exec(
        function(err, sites) {
            if (err) {
                replies.mongoErrorReply(res, err)
            } else {
                replies.jsonReply(res, sites)
            }
    });

    console.log(">>> Complete!");
    return next();
}

var site = function (req, res, next) {

    console.log("\n>>> Search for site with id: " + req.params[0]);

    database.SiteModel.findById(req.params[0], function(err, site) {
        if (err) {
            return mongoErrorReply(res, err)
        }

        if (site != null && site.length > 0) {
            replies.jsonReply(res, site)
        } else {
            replies.mongoEmptyReturn(res)
        }

    });

    console.log(">>> Complete!");
    return next();
}

var update = function (req, res, next) {
    var id = req.params[0];
    console.log("\n>>> Updating site with id: " + id);
    delete req.params[0];
    console.log(req.params);

    var success = parser.parseBody(req.params);
    console.log(">>> parsed:", req.params)
    if (!success) {
        replies.apiBadRequest(res, success);
        return next();
    }
    
    database.SiteModel.updateById(id, req.params, function(err, site) {
        if (err) {
            return replies.mongoEmptyReturn(res, site)
        }
        replies.jsonReply(res, site)
    });

    console.log(">>> Complete!");
    return next();
}
// exports
exports.respond = respond
exports.sites = sites
exports.site = site
exports.update = update 
