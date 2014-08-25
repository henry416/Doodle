var Canvas = function(socket) {
	this.socket = socket;
	var canvastmp = document.getElementById('canvas');
	this.context = canvastmp.getContext('2d');
	this.canvas = document.getElementById('canvas');
	this.mousedown = false;
};

Canvas.prototype.draw = function(evt, room) {
	var mousePos = this.getMousePos(this.canvas, evt);

	this.socket.emit('draw', {
		x: mousePos.x,
		y: mousePos.y,
		color: '#FF0000',
		room: room
	});

	this.context.fillStyle = '#FF0000';
	this.context.fillRect(mousePos.x, mousePos.y, 1, 1);
};

Canvas.prototype.getMousePos = function(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	var xval = evt.clientX - rect.left;
	var yval = evt.clientY - rect.top;

	if (xval >= 300) xval = 299;
	if (xval < 0) xval = 0;
	if (yval >= 300) yval = 299;
	if (yval < 0) yval = 0;
	
	return {
		x: xval,
		y: yval
	};
};