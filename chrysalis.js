// Modules
const util           = require("util");
const fs             = require("fs");
const http           = require("http");
const url            = require('url');
const exec           = require('child_process').exec;

// 3rd Party Modules
const randomstring   = require("randomstring");
const request        = require("request");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const package  = require("./package.json");

// Load file data
var config   = require("./config/config.json");
var strings  = require("./config/strings.json");
var httpkey  = require("./config/httpkey.json");
var term     = require("./config/term.json");

var urlTimeout;
var wait = false;
var queue = 0;

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

function queueLoop() {
    if (queue > 1)
        console.log(util.format(
            strings.debug.queueloop,
            queue - 1
        ));

    setTimeout(function() {
        queueLoop();
    }, config.options.queueloop * 1000);
}

function parseTime(text) {
    var parts = text.split(" ");
    return parseFloat(parts[parts.length - 2]);
}

function openURL(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    xhr.onreadystatechange = function () { 
        if (xhr.readyState == 4) {
            if (xhr.status == 200)
                console.log(strings.debug.send);
            else
                console.log(strings.debug.senderrA);
            
            clearTimeout(urlTimeout);
        }
    }
    xhr.onerror = function(err) {
        xhr.abort();

        console.log(strings.debug.senderrA);
    }
    xhr.ontimeout = function() {
        xhr.abort();

        console.log(strings.debug.senderrB);
    }

    xhr.send();

    urlTimeout = setTimeout(function() {
        xhr.abort();

        console.log(strings.debug.senderrB);
    }, config.options.timeout * 1000);
}

function decrQueue() {
    queue--;
    if (queue < 0)
        queue = 0;
}


function sendQueue(channelid, userid) {
    setTimeout(function() {
        var url = util.format(
            config.ann.waifu.queue,
            httpkey.key,
            queue - 1,
            channelid,
            userid
        );

        openURL(url);

        console.log(strings.debug.waifu.sendqueue);
    }, config.options.queuewait * 1000);
}


function sendErrorWaifu(imageIn, channelid, userid) {
    wait = false;
    decrQueue();

    // Delete old image
    var imageInPath = path + "/" + imageIn;
    if (fs.existsSync(imageInPath)) {
        fs.unlink(imageInPath, (err) => {
            if (err) throw err;
            console.log(util.format(
                strings.debug.waifu.delete,
                imageInPath
            ));
        });
    };

    var url = util.format(
        config.ann.waifu.error,
        httpkey.key,
        channelid,
        userid
    );

    openURL(url);

    console.log(strings.debug.waifu.finisherr);
}


function sendResultWaifu(path, imageIn, imageOut, channelid, userid, time) {
    wait = false;
    decrQueue();

    // Delete old image
    var imageInPath = path + "/" + imageIn;
    if (fs.existsSync(imageInPath)) {
        fs.unlink(imageInPath, (err) => {
            if (err) throw err;
            console.log(util.format(
                strings.debug.waifu.delete,
                imageInPath
            ));
        });
    };

    var size = fs.statSync(path + "/" + imageOut).size / 1024 / 1024;
    var timeTaken = (new Date() - time) / 1000;
    var pathParts =  path.split("/");
    var unique = pathParts[pathParts.length - 1];

    var url = util.format(
        config.ann.waifu.request,
        httpkey.key,
        config.ann.waifu.url + unique + "/" + imageOut,
        channelid,
        userid,
        timeTaken.toFixed(2),
        size.toFixed(2)
    );

    openURL(url);

    console.log(util.format(
        strings.debug.waifu.finish,
        timeTaken.toFixed(2)
    ));
}

function runWiafu(query, m, n, s) {
    if (!wait) {
        wait = true;

        var tStart = new Date();

        // Extract and generate image names
        var urlParts = query.url.split("/");
        var imageIn = urlParts[urlParts.length - 1];
        var imageOut = imageIn.split(".").slice(0, -1).join(".") + "_n" + n + "_s" + s + ".png";
        var unique = randomstring.generate({
            length:  12,
            charset: "alphabetic"
        });
        var path = config.ann.waifu.path + "/" + unique;

        // Make unique directory
        if (!fs.existsSync(path)){
            fs.mkdirSync(path);
        }

        // Download the image
        download(query.url, path + "/" + imageIn, function() {
            console.log(strings.debug.download.stop);

            // RESIZE SCALE 1 OR 2

            // Generate command
            var command = util.format(
                term.waifu, 
                path,
                m,
                n,
                imageIn,
                imageOut
            );
            if (s == 1)
                console.log(util.format(
                    strings.debug.waifu.start,
                    1,
                    command
                ));
            else
                console.log(util.format(
                    strings.debug.waifu.start,
                    2,
                    command
                ));

            // Execute command
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error("exec error: " + error);
                    sendErrorWaifu(path, imageIn, query.channelid, query.userid);
                    return;
                }

                if (s == 1 || s == 2) {
                    sendResultWaifu(path, imageIn, imageOut, query.channelid, query.userid, tStart);
                }
                else if (s > 2) {

                    // RESIZE SCALE 4

                    // Generate command
                    var command = util.format(
                        term.waifu, 
                        path,
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

                    // Execute command
                    exec(command, (error, stdout, stderr) => {
                        if (error) {
                            console.error("exec error: " + error);
                            sendErrorWaifu(path, imageIn, query.channelid, query.userid);
                            return;
                        }
                        

                        if (s == 4) {
                            sendResultWaifu(path, imageIn, imageOut, query.channelid, query.userid, tStart);
                        }
                        else if (s > 4) {

                            // RESIZE SCALE 

                            // Generate command
                            var command = util.format(
                                term.waifu, 
                                path,
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

                            // Execute command
                            exec(command, (error, stdout, stderr) => {
                                if (error) {
                                    console.error("exec error: " + error);
                                    sendErrorWaifu(path, imageIn, query.channelid, query.userid);
                                    return;
                                }

                                sendResultWaifu(path, imageIn, imageOut, query.channelid, query.userid, tStart);
                            });
                        }
                    });
                }                  

            });
        });

    }
    else {
        setTimeout(function() {
            runWiafu(query, m, n, s);
        }, 1000);
    }    
}


function processReqWaifu(query) {
    if (query.url != undefined && query.channelid != undefined && query.userid != undefined)  {

        // Process noise level
        var n = query.n;
        if (n == undefined)
            n = 0;

        if (n == 0 || n == 1 || n == 2 || n == 3) {

            // Process scale
            var s = query.s;
            if (s == undefined)
                s = 1;

            if (s == 1 || s == 2 || s == 4 || s == 8) {

                // Process method
                var m = "";
                if (n > 0 && s == 1)
                    m = "noise"
                else if (n == 0 && s > 1)
                    m = "scale"
                else  if (n > 0 && s > 1)
                    m = "noise_scale"
                if (m != "") {
                    queue++;

                    console.log(util.format(
                        strings.debug.waifu.request,
                        m,
                        n,
                        s
                    ));

                    if (queue > 1) {
                        console.log(util.format(
                            strings.debug.waifu.queue,
                            queue - 1
                        ));
                        sendQueue(query.channelid, query.userid);
                    }

                    runWiafu(query, m, n, s);
                }
                else {
                    console.log(strings.debug.waifu.errorD);
                } 
            }
            else {
                console.log(strings.debug.waifu.errorC);
            }
        }
        else {
            console.log(strings.debug.waifu.errorB);
        }
    }
    else {
        console.log(strings.debug.waifu.errorA);
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

    if (query.key == httpkey.key) {
    	if (query.action == "ping") {
		    res.writeHead(200, [
		        ["Content-Type", "text/plain"], 
		        ["Content-Length", 4]
		            ]);
    		res.write("pong");
    	}
    	else {
		    res.writeHead(200, [
		        ["Content-Type", "text/plain"], 
		        ["Content-Length", 0]
		            ]);
    		res.write("");
    	}
    }
    res.end();
};

function loadServer() {
    console.log(strings.debug.started);

    server = http.createServer(processRequest).listen(config.options.serverport);
}

loadServer();
queueLoop();