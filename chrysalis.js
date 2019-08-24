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
var term     = require("./config/term.json");

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

function parseTime(text) {
    var parts = text.split(" ");
    return parseFloat(parts[parts.length - 2]);
}


function sendResultWaifu(time, image) {
    console.log(util.format(
        strings.debug.waifu.finish,
        ((new Date() - time) / 1000).toFixed(2)
    ));
}


function processReqWaifu(query) {
    if (query.url != undefined && query.channelid != undefined && query.userid != undefined)  {

        var n = query.n;
        if (n == undefined)
            n = 0;

        var s = query.s;
        if (s == undefined)
            s = 0;
        if (!(s == 0 || s == 2 || s == 4 || s == 8)) {
            console.log(strings.debug.waifu.error);
        }
        else {
            var m = "";
            if (n > 0 && s == 0)
                m = "noise"
            else if (n == 0 && s > 1)
                m = "scale"
            else  if (n > 0 && s > 1)
                m = "noise_scale"

            if (m != "") {
                var tStart = new Date();

                console.log(util.format(
                    strings.debug.waifu.request,
                    m,
                    n,
                    s
                ));

                var urlParts = query.url.split("/");
                var imageIn = urlParts[urlParts.length - 1];
                var imageOut = imageIn.split(".").slice(0, -1).join(".") + "_n" + n + "_s" + s + ".png";

                download(query.url, config.options.waifupath + "/" + imageIn, function() {
                    console.log(strings.debug.download.stop);

                    var command = util.format(
                        term.waifu, 
                        config.options.waifupath,
                        m,
                        n,
                        imageIn,
                        imageOut
                    );
                    if (s == 0)
                        console.log(util.format(
                            strings.debug.waifu.start,
                            0,
                            command
                        ));
                    else
                        console.log(util.format(
                            strings.debug.waifu.start,
                            2,
                            command
                        ));

                    exec(command, (error, stdout, stderr) => {
                        if (error) {
                            console.error("exec error: " + error);
                            return;
                        }

                        if (s == 0 || s == 2) {
                            sendResultWaifu(tStart, imageOut);
                        }
                        else if (s > 2) {
                            var command = util.format(
                                term.waifu, 
                                config.options.waifupath,
                                m,
                                n,
                                imageOut,
                                imageOut
                            );
                            console.log(util.format(
                                strings.debug.waifu.start,
                                4,
                                command
                            ));

                            exec(command, (error, stdout, stderr) => {
                                if (error) {
                                    console.error("exec error: " + error);
                                    return;
                                }
                                

                                if (s == 4) {
                                    sendResultWaifu(tStart, imageOut);
                                }
                                else if (s > 4) {
                                    var command = util.format(
                                        term.waifu, 
                                        config.options.waifupath,
                                        m,
                                        n,
                                        imageOut,
                                        imageOut
                                    );
                                    console.log(util.format(
                                        strings.debug.waifu.start,
                                        8,
                                        command
                                    ));

                                    exec(command, (error, stdout, stderr) => {
                                        if (error) {
                                            console.error("exec error: " + error);
                                            return;
                                        }

                                        sendResultWaifu(tStart, imageOut);
                                    });
                                }
                            });
                        }                  

                    });
                });

            }
            else {
                console.log(strings.debug.waifu.error);
            } 
        }
    }
    else {
        console.log(strings.debug.waifu.error);
    }
}

var processRequest = function(req, res) {
    if (req.method == "GET") {
        var query = url.parse(req.url, true).query;
        if (query.key == httpkey.key)
            switch (query.action) {
                case "waifu": processReqWaifu(query); break;
            }  
    }

    //console.log("  Connection! " + res.socket.remoteAddress + " " + req.url);

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