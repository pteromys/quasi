var Movable = (function () {

var Movable = function () {
	this.velocity = [0, 0]; // velocity in user units (e.g. pixels/msec)
	this.speed = [1, 1]; // speed scale in user units
	this.key_map = {};
	this.key_map[this.KEYS.LEFT] = {which: 0, amount: -1};
	this.key_map[this.KEYS.RIGHT] = {which: 0, amount: 1};
	this.key_map[this.KEYS.UP] = {which: 1, amount: -1};
	this.key_map[this.KEYS.DOWN] = {which: 1, amount: 1};
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
	this.decay_rate = this.decay_coast;
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
	run_multiplier: 4,
	decay_coast: 0.002, // stop in about 0.5s
	decay_brake: 0.01, // stop in about 0.1s

	updateVelocity: function (dt) {
		dt = dt || this.default_dt;
		var vmax = 1;
		if (this.keys_down[this.KEYS.SHIFT]) { vmax *= this.run_multiplier; }
		var m = this;
		var clampAndDecay = function (t, i) {
			var v_bound = vmax * (m.speed[i] || 1);
			var decay = v_bound * m.decay_rate * dt;
			if (t < -decay) { t += decay; }
			else if (t > decay) { t -= decay; }
			else { t = 0; }
			return Math.max(-v_bound, Math.min(t, v_bound));
		};
		if (this.canAccelerate()) {
			for (var key in this.key_map) {
				if (!this.key_map.hasOwnProperty(key)) { continue; }
				var km = this.key_map[key];
				this.velocity[km.which] = this.velocity[km.which] || 0;
				if (this.keys_down[key]) {
					this.velocity[km.which] +=
						0.012 * vmax * (this.speed[km.which] || 1) * km.amount * dt;
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
		for (var i = 0; i < this.velocity.length; i++) {
			if (this.velocity[i]) { return true; }
		}
		for (var key in this.key_map) {
			if (this.key_map.hasOwnProperty(key) && this.keys_down[key]) { return true; }
		}
		return false;
	},
	bind: function (element) {
		this.bindKeyboard(element);
		this.bindTouch(element);
	},
	bindKeyboard: function (element) {
		var t = this;
		var press = function (e) {
			if (t.key_map[e.which]) {
				t.keys_down[e.which] = true;
				t.decay_rate = t.decay_brake;
				t.motionCallback();
			}
			t.keys_down[t.KEYS.SHIFT] = e.shiftKey;
			if (e.which == t.KEYS.ESC && t.canAccelerate()) {
				t.moveReset();
				t.decay_rate = t.decay_brake;
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
		element = $(element);
		element.on('keydown.mKeyboard', press);
		element.on('keyup.mKeyboard', release);
		element.on('blur.mKeyboard mouseleave.mKeyboard', releaseAll);
	},
	bindTouch: function (element) {
		var t = this;
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
		element.on('mousedown.mMouse touchstart.mMouse', mousePress);
		element.on('blur.mMouse mouseup.mMouse mouseleave.mMouse touchend.mMouse touchcancel.mMouse', mouseRelease);
		element.on('mousemove.mMouse touchmove.mMouse', mouseMove);
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
			this.decay_rate = this.decay_coast;
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
