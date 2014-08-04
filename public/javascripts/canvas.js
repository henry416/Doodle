var Canvas = function(socket) {
	this.socket = socket;
	var canvastmp = document.getElementById('canvas');
	this.context = canvastmp.getContext('2d');
	this.canvas = document.getElementById('canvas');
	this.mousedown = false;
};

Canvas.prototype.draw = function(evt, room) {
	var mousePos = this.getMousePos(this.canvas, evt);
	//var message = 'Mouse position: ' + mousePos.x + ',' + mousePos.y;
	//$('#messages').append(divSystemContentElement(message));

	this.socket.emit('draw', {
		x: mousePos.x,
		y: mousePos.y,
		color: '#FF0000',
		room: room
	});
};

Canvas.prototype.getMousePos = function(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
};