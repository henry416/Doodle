var myname = null;

function divEscapedContentElement(message) {
	return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
	return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
	var message = $('#send-message').val();
	var systemMessage;

	// command
	if (message.charAt(0) == '/') {
		systemMessage = chatApp.processCommand(message);
		if (systemMessage) {
			$('#messages').append(divSystemContentElement(systemMessage));
		}
	}
	// normal chat
	else {
		chatApp.sendMessage($('#room').text(), message);
		$('#messages').append(divEscapedContentElement(myname + ": " + message));
		$('#messages').scrollTop($('#messages').prop('scrollHeight'));
	}

	$('#send-message').val('');
}

var socket = io.connect();

$(document).ready(function() {
	var chatApp = new Chat(socket);
	var canvasApp = new Canvas(socket);

	socket.on('nameResult', function(result) {
		var message
		if (result.success) {
			message = 'You are now known as ' + result.name + '.';
			myname = result.name;
		} 
		else {
			message = result.message;
		}
		$('#messages').append(divSystemContentElement(message));
	});

	socket.on('joinResult', function(result) {
		$('#room').text(result.room);
		$('#messages').append(divSystemContentElement('Room changed.'));
	});

	socket.on('message', function (message) {
		var newElement = $('<div></div>').text(message.text);
		$('#messages').append(newElement);
	});

	socket.on('rooms', function(rooms) {
		$('#room-list').empty();
		for(var room in rooms) {
			room = room.substring(1, room.length);
			
			if (room != '') {
				$('#room-list').append(divEscapedContentElement(room));
			}
		}

		$('#room-list div').click(function() {
			chatApp.processCommand('/join ' + $(this).text());
			$('#send-message').focus();
		});
	});

	socket.on('draw', function(drawData) {
		//$('#messages').append(divSystemContentElement("Draw at " + drawData.x + ", " + drawData.y));
		canvasApp.context.fillStyle = drawData.color;
		canvasApp.context.fillRect(drawData.x, drawData.y, 1, 1);
	});

	socket.on('syncCanvas', function(imageData) {
		//canvasApp.context.drawImage(imageData.data, 0, 0);
		canvasApp.context.clearRect(0, 0, 300, 300);
		var imageObj = new Image();
		imageObj.onload = function() {
			canvasApp.context.drawImage(this, 0,0);
		};
		imageObj.src = imageData.data;
	});

	setInterval(function() {
		socket.emit('rooms');
	}, 1000);

	$('#send-message').focus();
	
	$('#send-button').click(function() {
		processUserInput(chatApp, socket);
		return false;
	});

	$('#sync-canvas').click(function() {
		socket.emit('getImage', {
			room: $('#room').text()
		})
		return false;
	});

	$('#canvas').on('mousedown mouseup mouseleave', function mouseState(evt) {
		if (evt.type == "mousedown") {
			// mouse is held down on the canvas
			canvasApp.draw(evt, $('#room').text());
			canvasApp.mousedown = true;
		}
		else if (evt.type == "mouseup" || evt.type == "mouseleave") {
			// mouse leaves the canvas or is released
			canvasApp.mousedown = false;
		}
	});

	$('#canvas').on('mousemove', function mouseState(evt) {
		if (canvasApp.mousedown == true) {
			// mouse being held down on the canvas and being dragged
			canvasApp.draw(evt, $('#room').text());
		}
	});

});
