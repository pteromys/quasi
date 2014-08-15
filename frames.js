var FrameManager = (function () {

var nativeRequestAnimFrame =
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function (callback, element) {
		window.setTimeout(function () {
			return callback((new Date()).valueOf() + 16);
		}, 16);
	};

var FrameManager = function (callback) {
	// callback's args are those of window.requestAnimationFrame.
	// Its return value answers "Do I need to draw again?".
	// "this" is the FrameManager instance, which precomputes:
	//     this.prev_time = scheduled time for the frame that
	//         triggered this one via its return value
	//     this.dt = ticks since prev_time || this.DEFAULT_DT
	// You can also call this.currentFrameTime(), which tells the
	// milliseconds elapsed since this frame started being drawn.
	this.next_id = NaN;
	this.prev_time = NaN;
	this.last_frame_start = NaN;
	this.dt = this.DEFAULT_DT;
	this.drawCallback = callback || function () {};
	this.requestFrame = this.requestFrame.bind(this);
	this.drawWrapper = this.drawWrapper.bind(this);
};

FrameManager.prototype = {
	DEFAULT_DT: 16,

	requestFrame: function () {
		if (!this.next_id) {
			this.next_id = nativeRequestAnimFrame(this.drawWrapper);
		}
		return this.next_id;
	},
	drawWrapper: function (time_scheduled) {
		this.next_id = NaN;
		this.setFrameStart(time_scheduled);
		this.dt = (time_scheduled - this.prev_time) || this.DEFAULT_DT;
		// Call the user-supplied callback. Might take a while.
		var draw_again = this.drawCallback.apply(this, arguments);
		// Request another frame if we need to.
		// Is after the callback for better chances of making the deadline.
		if (draw_again) {
			this.prev_time = time_scheduled;
			this.requestFrame();
		} else {
			this.prev_time = NaN;
		}
	},
};

if (window.performance && window.performance.now) {
	FrameManager.prototype.setFrameStart = function (time_scheduled) {
		this.last_frame_start = time_scheduled;
	};
	FrameManager.prototype.currentFrameTime = function () {
		return (window.performance.now() - this.last_frame_start) || 16;
	};
} else {
	FrameManager.prototype.setFrameStart = function (time_scheduled) {
		this.last_frame_start = (new Date()).valueOf();
	};
	FrameManager.prototype.currentFrameTime = function () {
		return ((new Date()).valueOf() - this.last_frame_start) || 16;
	};
}

return FrameManager;
})();
