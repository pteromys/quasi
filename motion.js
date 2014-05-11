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
	default_dt: 16,
	v_walk: 0.0025,
	v_run: 0.01,
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
			if (this.keys_down[this.KEYS.UP]) { this.velocity[1] += dv; }
			if (this.keys_down[this.KEYS.DOWN]) { this.velocity[1] -= dv; }
			if (this.keys_down[this.KEYS.LEFT]) { this.velocity[0] -= dv; }
			if (this.keys_down[this.KEYS.RIGHT]) { this.velocity[0] += dv; }
		}
		this.velocity = this.velocity.map(clampAndDecay);
	},
	update: function (dt) {
		dt = dt || this.default_dt;
		this.updateVelocity(dt);
		if (this.isMoving()) {
			this.move(dt);
		}
	},
	canAccelerate: function () {
		return true;
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
			}
			t.keys_down[t.KEYS.SHIFT] = e.shiftKey;
		};
		var release = function (e) {
			if (typeof(t.keys_down[e.which]) != 'undefined') {
				t.keys_down[e.which] = false;
			}
			t.keys_down[t.KEYS.SHIFT] = e.shiftKey;
		};
		var release_all = function (e) {
			for (k in t.keys_down) {
				t.keys_down[k] = false;
			}
		};
		element = $(element);
		element.on('keydown', press);
		element.on('keyup', release);
		element.on('blur mouseleave', release_all);
	},
}
