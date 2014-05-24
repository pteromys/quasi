var Movable = function () {
	this.velocity = [0, 0];
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
			if (this.keys_down[this.KEYS.UP]) { this.velocity[1] -= dv; }
			if (this.keys_down[this.KEYS.DOWN]) { this.velocity[1] += dv; }
			if (this.keys_down[this.KEYS.LEFT]) { this.velocity[0] -= dv; }
			if (this.keys_down[this.KEYS.RIGHT]) { this.velocity[0] += dv; }
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
		return (this.velocity[0] || this.velocity[1] ||
			this.keys_down[this.KEYS.UP] ||
			this.keys_down[this.KEYS.DOWN] ||
			this.keys_down[this.KEYS.LEFT] ||
			this.keys_down[this.KEYS.RIGHT]);
	},
	bindHandlers: function (element) {
		var t = this;
		var press = function (e) {
			if (typeof(t.keys_down[e.which]) != 'undefined') {
				t.keys_down[e.which] = true;
				t.motionCallback();
			}
			t.keys_down[t.KEYS.SHIFT] = e.shiftKey;
			if (e.which == t.KEYS.ESC) {
				t.moveReset();
				t.motionCallback();
			}
		};
		var release = function (e) {
			if (typeof(t.keys_down[e.which]) != 'undefined') {
				t.keys_down[e.which] = false;
			}
			t.keys_down[t.KEYS.SHIFT] = e.shiftKey;
		};
		var releaseAll = function (e) {
			for (var k in t.keys_down) {
				t.keys_down[k] = false;
			}
		};
		var mousePress = function (e) {
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
				e.preventDefault();
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
		element.on('mouseup mouseleave touchend touchcancel', mouseRelease);
		element.on('mousemove touchmove', mouseMove);
	},

	// Default implementation
	canAccelerate: function () {
		return true;
	},
	move: function (dt) {
		this.position[0] += movable.velocity[0] * dt;
		this.position[1] += movable.velocity[1] * dt;
	},
	moveReset: function () {
		this.position[0] = this.position[1] = 0;
		this.velocity[0] = this.velocity[1] = 0;
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
}
