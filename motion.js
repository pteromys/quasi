var Movable = (function () {

var Movable = function () {
	this.velocity = [0, 0];
	this.velocity_keys = [ // [decrease, increase]
		[this.KEYS.LEFT, this.KEYS.RIGHT],
		[this.KEYS.UP, this.KEYS.DOWN],
	];
	this.keys_down = {
		"16": false,
		"37": false,
		"38": false,
		"39": false,
		"40": false,
		"mouse": false,
	};
	this.last_taps = {
		down: 0,
		down_old: 0,
		up: 0,
		xy: [0, 0],
		xy_old: [0, 0],
	};
	// Default implementation
	this.position = [0, 0];
	this.last_motion = [0, 0];
	this.last_dt = this.default_dt;
};

Movable.prototype = {
	KEYS: {
		"SHIFT": 16,
		"ESC": 27,
		"SPACE": 32,
		"LEFT": 37,
		"UP": 38,
		"RIGHT": 39,
		"DOWN": 40,
		"<": 188,
		">": 190,
		"QUESTION": 191,
		"TILDE": 192,
		"APOSTROPHE": 222,
	},
	DOUBLETAP_THRESHOLD: 300,
	TAP_MOVE_THRESHOLD: 16,
	default_dt: 16,
	v_walk: 0.5,
	v_run: 2,

	updateVelocity: function (dt) {
		dt = dt || this.default_dt;
		var vmax = this.v_walk;
		if (this.keys_down[this.KEYS.SHIFT]) { vmax = this.v_run; }
		var dv = 0.012 * vmax * dt;
		var decay = 0.01 * vmax * dt;
		var clampAndDecay = function (t) {
			if (t < -decay) { t += decay; }
			else if (t > decay) { t -= decay; }
			else { t = 0; }
			return Math.max(-vmax, Math.min(t, vmax));
		};
		if (this.canAccelerate()) {
			for (var i = 0; i < this.velocity_keys.length; i++) {
				this.velocity[i] = this.velocity[i] || 0;
				if (this.keys_down[this.velocity_keys[i][0]]) {
					this.velocity[i] -= dv;
				}
				if (this.keys_down[this.velocity_keys[i][1]]) {
					this.velocity[i] += dv;
				}
			}
		}
		this.velocity = this.velocity.map(clampAndDecay);
	},
	update: function (dt) {
		dt = this.last_dt = dt || this.default_dt;
		this.updateVelocity(dt);
		if (this.isMoving()) {
			this.move(dt);
			this.motionCallback();
		}
	},
	isMoving: function () {
		for (var i = 0; i < this.velocity_keys.length; i++) {
			if (this.velocity[i]) { return true; }
			if (this.keys_down[this.velocity_keys[i][0]]) { return true; }
			if (this.keys_down[this.velocity_keys[i][1]]) { return true; }
		}
		return false;
	},
	bindHandlers: function (element) {
		var t = this;
		var press = function (e) {
			function hasKey(a) {
				return (a[0] == e.which || a[1] == e.which);
			}
			if (t.velocity_keys.some(hasKey)) {
				t.keys_down[e.which] = true;
				t.motionCallback();
			}
			t.keys_down[t.KEYS.SHIFT] = e.shiftKey;
			if (e.which == t.KEYS.ESC && t.canAccelerate()) {
				t.moveReset();
				t.motionCallback();
			}
		};
		var release = function (e) {
			if (t.keys_down[e.which]) { t.keys_down[e.which] = false; }
			t.keys_down[t.KEYS.SHIFT] = e.shiftKey;
		};
		var releaseAll = function (e) {
			if (e.type == 'mouseleave' && e.toElement) { return; }
			for (var k in t.keys_down) {
				if (k != 'mouse') {
					t.keys_down[k] = false;
				}
			}
		};
		var mousePress = function (e) {
			if (!t.canAccelerate()) { return; }
			if ($(e.target).is('a[href], input, select, textarea, button')) { return; }
			if (!(e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length > 1)) {
				e.preventDefault();
			}
			if (typeof(e.pageX) === 'undefined') {
				e = e.originalEvent.touches[0];
			}
			t.keys_down['mouse'] = [e.pageX, e.pageY];
			t.last_taps.down_old = t.last_taps.down;
			t.last_taps.down = (new Date()).valueOf();
			t.last_taps.xy_old = t.last_taps.xy;
			t.last_taps.xy = [e.pageX, e.pageY];
		};
		var mouseRelease = function (e) {
			if (e.type == 'mouseleave' && e.toElement) { return; }
			// Check tap-motion threshold
			if (!t.last_taps.xy.every(function (x, i) {
					return Math.abs(x - t.keys_down['mouse'][i]) < t.TAP_MOVE_THRESHOLD;
				}))
			{
				t.last_taps.down = NaN;
			}
			if (!t.last_taps.xy.every(function (x, i) {
					return Math.abs(x - t.last_taps.xy_old[i]) < t.TAP_MOVE_THRESHOLD;
				}))
			{
				t.last_taps.down_old = NaN;
			}
			// Check doubletap delay threshold
			var now = (new Date()).valueOf();
			if ([t.last_taps.down, t.last_taps.down_old, t.last_taps.up].every(
				function (x) { return now - x < t.DOUBLETAP_THRESHOLD}))
			{
				t.moveReset();
				t.motionCallback();
			}
			t.last_taps.up = now;
			// Reset mouse position
			t.keys_down['mouse'] = false;
			// Set coasting velocity
			t.moveCoast();
		};
		var mouseMove = function (e) {
			if (!(e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length > 1)) {
				if (t.canAccelerate()) {
					e.preventDefault();
				}
			}
			if (typeof(e.pageX) === 'undefined') {
				e = e.originalEvent.touches[0];
			}
			// Check that the mouse is down and update position
			var p = t.keys_down['mouse'];
			if (!p) { return; }
			var q = [e.pageX, e.pageY];
			t.keys_down['mouse'] = q;
			// Quit early if no motion or if any dialogs are active
			if (p[0] == q[0] && p[1] == q[1]) { return; }
			if (!t.canAccelerate()) { return; }
			t.moveFromTo(p, q);
			t.motionCallback();
		};
		element = $(element);
		element.on('keydown', press);
		element.on('keyup', release);
		element.on('blur mouseleave', releaseAll);
		element.on('mousedown touchstart', mousePress);
		element.on('blur mouseup mouseleave touchend touchcancel', mouseRelease);
		element.on('mousemove touchmove', mouseMove);
	},

	// Default implementation
	canAccelerate: function () {
		return true;
	},
	move: function (dt) {
		for (var i = 0; i < this.velocity.length; i++) {
			this.position[i] = this.position[i] || 0;
			this.position[i] += this.velocity[i] * dt;
		}
	},
	moveReset: function () {
		for (var i = 0; i < this.velocity.length; i++) {
			this.position[i] = this.velocity[i] = 0;
		}
	},
	moveFromTo: function (a, b) {
		this.position[0] += this.last_motion[0] = a[0] - b[0];
		this.position[1] += this.last_motion[1] = a[1] - b[1];
	},
	moveCoast: function () {
		if (this.last_dt && this.last_motion) {
			this.velocity[0] = this.last_motion[0] / this.last_dt;
			this.velocity[1] = this.last_motion[1] / this.last_dt;
			this.last_motion[0] = 0;
			this.last_motion[1] = 0;
		}
	},
	motionCallback: function () {},
};

/* Add letters, numbers, and F keys */
for (var i = 0; i < 10; i++) {
	Movable.prototype.KEYS[i] = 48 + i;
}
for (var i = 65; i < 91; i++) {
	Movable.prototype.KEYS[String.fromCharCode(i)] = i;
}
for (var i = 1; i < 13; i++) {
	Movable.prototype.KEYS["F" + i] = 111 + i;
}

return Movable;

})();
