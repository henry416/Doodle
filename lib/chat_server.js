var socketio = require('socket.io');
var io;						// io server
var guestNumber = 1;		// tracks users
var nickNames = {};			
var namesUsed = [];
var currentRoom = {};		// users in room
var images = {};

var fs = require('fs');
var canvas = require('canvas');
//var image = new canvas(300,300);
//var ctx = image.getContext('2d');

// socket.io server
exports.listen = function(server) {
	io = socketio.listen(server);		// start server, piggyback on existing http server
	io.set('log level', 1);
	io.sockets.on('connection', function (socket) {
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
		joinRoom(socket, 'Lobby');
		refreshImage(socket, 'Lobby');

		// handle user changes
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);
		handleDraw(socket);
		handleGetImage(socket);
		
		// provide user with list of occupied rooms
		socket.on('rooms', function() {
			socket.emit('rooms', io.sockets.manager.rooms);
		});
		
		// cleanup
		handleClientDisconnection(socket, nickNames, namesUsed);
	});
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Guest' + guestNumber;	// generate name
	nickNames[socket.id] = name;		// assign name with client conn ID
	socket.emit('nameResult', {		// let user know their name
		success: true,
		name: name
	});
	namesUsed.push(name);		// store name

	return guestNumber + 1;		// increment counter
}

function joinRoom(socket, room) {
	socket.join(room);					// join room
	currentRoom[socket.id] = room;		// user noted
	socket.emit('joinResult', {room: room});	

	var imgTmp;
	try {
		imgTmp = images[room];
		var doesCanvasDNE = imgTmp.getContext('2d');
		doesCanvasDNE.save();
	}
	catch (err) {
		console.log("Creating new image for " + room);
		imgTmp = new canvas(300,300);
		images[room] = imgTmp;
		imgTmp.getContext('2d').save();
	}

	// broadcast the user joining to all other participants
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});

	// summarize who is in the room
	var usersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for (var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id) {
				if (index > 0) {
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text: usersInRoomSummary});
	}

	refreshImage(socket, room);
}

function refreshImage(socket, room) {
	//http://www.websector.de/blog/2011/12/22/pushing-binary-image-data-using-node-js-and-socket-io/
	var imgTmp;
	try {
		imgTmp = images[room];
		var ctx = imgTmp.getContext('2d');
		ctx.save();
	}
	catch (err) {
		console.log("Creating new image for " + room);
		imgTmp = new canvas(300,300);
		images[room] = imgTmp;
		imgTmp.getContext('2d').save();
	}

	var img = images[room];
	var dataurl = img.toDataURL("image/png");
	socket.emit('syncCanvas', {
		data: dataurl
	});
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	// listener for nameAttempt
	socket.on('nameAttempt', function(name) {
		// disallow name
		if (name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		}
		else {
			// name not used
			if (namesUsed.indexOf(name) == -1) {

				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);	// get previous index
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];		// remove previous name
				
				socket.emit('nameResult', {
					success: true,
					name: name
				});
				
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				});
			}
			else {
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
				});
			}
		}
	});
}

function handleMessageBroadcasting(socket) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}

function handleRoomJoining(socket) {
	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

function handleClientDisconnection(socket) {
	socket.on('disconnect', function() {
		var room = currentRoom[socket.id];
		var usersInRoom = io.sockets.clients(room).length;

		// broadcast the user joining to all other participants
		socket.broadcast.to(room).emit('message', {
			text: nickNames[socket.id] + ' has left the chatroom: ' + room + '.'
		});

		var realusersinRoom = usersInRoom-1;
		console.log("User " + nickNames[socket.id] + " has disconnected, number of users left: " + realusersinRoom);
		if (usersInRoom == 1) {
			delete images[room];
			console.log("Deleted image for " + room);
		}
		
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}

function handleDraw(socket) {
	socket.on('draw', function(drawData) {
		var ctx = images[drawData.room].getContext('2d');
		ctx.fillStyle = drawData.color;
		ctx.fillRect(drawData.x, drawData.y, 1, 1);

		socket.broadcast.to(drawData.room).emit('draw', {
			x: drawData.x,
			y: drawData.y,
			color: drawData.color
		});
	});
}

function handleGetImage(socket) {
	socket.on('getImage', function(roomData) {
		refreshImage(socket, roomData.room);	
	});
}

