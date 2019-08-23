// Modules
const util           = require("util");
const fs             = require("fs");
const http           = require("http");
const url            = require('url');
const exec           = require('child_process').exec;

// 3rd Party Modules
const request        = require("request");

const package  = require("./package.json");

// Load file data
var config   = require("./config/config.json");
var strings  = require("./config/strings.json");
var httpkey  = require("./config/httpkey.json");

// Persistent objects
var server;

// Callback for downloading of files. 
var download = function(uri, filename, callback) {
        request.head(uri, function(err, res, body) {
            console.log(util.format(
                    strings.debug.download.start,
                    uri
                ));

            request({
                "method": "GET", 
                "rejectUnauthorized": false, 
                "url": uri,
                "headers" : {"Content-Type": "application/json"},
                function(err,data,body) {}
            }).pipe(fs.createWriteStream(filename)).on("close", callback);
        });
    };



function processReqWaifu(query) {
}

var processRequest = function(req, res) {
    if (req.method == "GET") {
        var query = url.parse(req.url, true).query;
        if (query.key == httpkey.key)
            switch (query.action) {
                case "waifu":  processReqWaifu(query);  break;
            }       
    }

    console.log("Connection! " + res.socket.remoteAddress + " " + req.url);

    res.writeHead(200, [
        ["Content-Type", "text/plain"], 
        ["Content-Length", 0]
            ]);
    if (query.key == httpkey.key)
    res.write("");
    res.end();
};

function loadServer() {
    console.log(strings.debug.started);
    
    server = http.createServer(processRequest).listen(config.options.serverport);
}

loadServer();