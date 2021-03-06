// dependancies
var restify = require('restify');
var _ = require('lodash-node');
var mkdirp = require('mkdirp');

// local includes
var database = require('../models/dbcontroller.js');
var replies = require('./responses.js');
var log = require('./../log/logger.js').log;

function near(req, res, next) {
    req.log.info("GET near facility REQUEST", {"req": req.params})

    var lat = req.params.lat;
    var lng = req.params.lng;
    var rad = req.params.rad;
    var units = req.params.units || 'mi';
    var earthRad = 3959; // miles
    if (units === 'km') {
        earthRad = 6371;
    }

    if (isNaN(rad) || parseInt(rad) < 0 || isNaN(lng) || isNaN(lat)) {
        replies.apiBadRequest(res, "TODO: This message is not used!");
        return;
    }

    //(lat < 0) || (lng < 0) 
    database.SiteModel.findNear(lng, lat, rad, earthRad, function(err, sites) {
        if (err) {
            req.log.error(err);
            return replies.dbErrorReply(res, err);
        }

        if (sites !== null && sites.length > 0) {
            // check if a site is empty in JSON form (it can never be empty otherwise
            var a_site = JSON.stringify(sites[0].toJSON());
            if (a_site !== "{}") { 
                replies.jsonArrayReply(res, sites, 200);
            } else {
                replies.dbEmptyReturn(res);
            }
        } else {
            replies.dbEmptyReturn(res);
        }

        return next(); 

    });       
}

function nearID(req, res, next) {
    req.log.info("GET near facility with id REQUEST", {"req": req.params})

    database.SiteModel.findById(req.params[2], function(err, sites) {
        if (err) {
            req.log.error(err);
            return replies.dbErrorReply(res, err);
        }

        if (sites === null || sites.length != 1) {
            return replies.dbEmptyReturn(res);

        } else {
            site = sites[0]; // should only be one
            console.log(site);
            console.log(req.params.length);
            console.log(req.params);
            req.params.rad = req.params[0];
            req.params.units = req.params[3];

            req.params.lng = site.coordinates[0];
            req.params.lat = site.coordinates[1];
            return near(req, res, next);
        }
    });
}


function within(req, res, next) {
    req.log.info("GET within facility REQUEST", {"req": req.params})

    var swlat = req.params.swlat;
    var swlng = req.params.swlng;
    var nelat = req.params.nelat;
    var nelng = req.params.nelng;

    if (isNaN(swlat) || isNaN(swlng) || isNaN(nelng) || isNaN(nelat)) {
        replies.apiBadRequest(res, "TODO: This message is not used!");
        return;
    }

    database.SiteModel.findWithin(swlat, swlng, nelat, nelng, function(err, sites) {
        if (err) {
            req.log.error(err);
            return replies.dbErrorReply(res, err);
        }

        if (sites !== null && sites.length > 0) {
            // check if a site is empty in JSON form (it can never be empty otherwise
            var a_site = JSON.stringify(sites[0].toJSON());
            if (a_site !== "{}") { 
                replies.jsonArrayReply(res, sites, 200);
            } else {
                replies.dbEmptyReturn(res);
            }
        } else {
            replies.dbEmptyReturn(res);
        }

        return next(); 
    });
}

function withinSector(req, res, next) {
    req.log.info("GET within sector facility REQUEST", {"req": req.params})

    var swlat = req.params.swlat;
    var swlng = req.params.swlng;
    var nelat = req.params.nelat;
    var nelng = req.params.nelng;
    var sector = req.params.sector;

    if (isNaN(swlat) || isNaN(swlng) || isNaN(nelng) || isNaN(nelat)) {
        replies.apiBadRequest(res, "TODO: This message is not used!");
        return;
    }


    database.SiteModel.findWithinSector(swlat, swlng, nelat, nelng, sector, function(err, sites) {
        if (err) {
            req.log.error(err);
            return replies.dbErrorReply(res, err);
        }

        if (sites !== null && sites.length > 0) {
            // check if a site is empty in JSON form (it can never be empty otherwise
            var a_site = JSON.stringify(sites[0].toJSON());
            if (a_site !== "{}") { 
                replies.jsonArrayReply(res, sites, 200);
            } else {
                replies.dbEmptyReturn(res);
            }
        } else {
            replies.dbEmptyReturn(res);
        }

        return next(); 
    });
}

//TODO: Refactor, does too much work 
exports.uploadPhoto = function (req, res, next) {
    req.log.info("POST photo to facility REQUEST", {"req": req.params, "files": req.files})
    var siteId = req.params.id || null;

    // if no sideId is included in request, error
    if (!siteId) {
        return next(new restify.MissingParameterError("The required siteId parameter is missing."));
    }

    if (!req.files || typeof req.files.photo === 'undefined') {
        return next(new restify.MissingParameterError("The required photo parameter is missing."));
    }

    // make sure the id is associated with a known Site
    database.SiteModel.findById(siteId, function (err, site) { 
        if (err) {
            req.log.error(err);
            return next(new restify.ResourceNotFoundError(JSON.stringify(err)));
        }

        // returns as an array
        site = site[0];

        // move the uploaded photo from the temp location (path property) to its final location
        fs.readFile(req.files.photo.path, function (err, data) {
    		if (err) {
    			req.log.err(err);
    		}

            // excuse the dir hack
            var rootPath = __dirname + "/../public/sites/photos",
                siteDir = siteId,
                filePath = req.files.photo.name,
                fullPath = rootPath + '/' + siteDir + '/' + filePath;

            // create the dir for the site
            mkdirp(rootPath + '/' + siteDir, function (err) {
                if (err) {
                    req.log.err(err);
                    //log.error(err);
                    return next(new restify.InternalError(JSON.stringify(err)));
                } else {
                    fs.writeFile(fullPath, data, function (err) {
            			if (err) {
                            req.log.error(err);
            				return next(new restify.InternalError(JSON.stringify(err)));
            			}

                        var url = 'http://' + req.header('Host') + '/sites/photos/' + siteDir + '/' +  filePath;

                        var index = -1; // cannot assume properties is defined
                        if (!site.properties) { 
                            site.properties = {};
                            site.properties.photoUrls = [];
                        } else {
                            // check that this photo is new. we'll replace the tmp path with the url
                            // TODO: Ask Jon about this tmp thing, not sure how this can happen??
                            index = site.properties.photoUrls.indexOf('tmp/'+req.files.photo.name);

                        }

                        //log.debug(">>> photo ind:", index, site.properties.photoUrls.indexOf(url));
                        if (index != -1) { 
                            site.properties.photoUrls.splice(index, 1, url);
                        } else if (site.properties.photoUrls.indexOf(url) == -1) {
                            // must be new url
                            site.properties.photoUrls.push(url);
                        }

                        //log.debug('site photo url: ' + url);
			
                        site.save(function (err, updatedSite, numberAffected) {
                            if (err) {
                                req.log.error(err);
                				return next(new restify.InternalError(JSON.stringify(err)));
            				}
                            //log.debug('site saved, sending response');
				            // no error, send success
                            res.send(updatedSite);
                        });
                    });
                }
            });
        });
    });
};

// exports
exports.within = within;
exports.withinSector = withinSector;
exports.near = near;
exports.nearID = nearID;
