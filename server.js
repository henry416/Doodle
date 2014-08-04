var http = require('http');		// http module
var fs = require('fs');			// filesystem module
var path = require('path');
var mime = require('mime');
var cache = {};					// cache object, for frequently accessed files

var server = http.createServer(function(request, response) {
	var filePath = false;

	if (request.url == '/') {
		filePath = 'public/index.html';		// default file to be served
	}
	else {
		filePath = 'public' + request.url;	// relative file path to serve
	}

	var absPath = './' + filePath;
	serveStatic(response, cache, absPath);		// serve static file
});

// socket.io
var chatServer = require('./lib/chat_server');
chatServer.listen(server);

// http server
server.listen(3000, function() {
	console.log("Server listening on port 3000.");
});


// 404 helper function
function send404(response) {
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: resource not found.');
	response.end();
}

// File data sender
function sendFile(response, filePath, fileContents) {
	response.writeHead(
		200,
		{"content-type": mime.lookup(path.basename(filePath))}
	);
	response.end(fileContents);
}

// File Cache or Retrieve from filesystem
function serveStatic(response, cache, absPath) {
	// if file cache in memory
	if (cache[absPath]) {
		sendFile(response, absPath, cache[absPath]);	// send file from memory
	}
	else {
		// check if file exists
		fs.exists(absPath, function(exists) {
			if (exists) {
				// read file from disk
				fs.readFile(absPath, function(err,data) {
					if (err) {
						send404(response);
					}
					else {
						cache[absPath] = data;
						sendFile(response, absPath, data);
					}
				});
			}
			else {
				send404(response);
			}
		});
	}
}

