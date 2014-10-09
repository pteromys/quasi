var MovableTouch = (function () {

var MovableTouch = function () {
	// Touch-richer variant of Movable. Requires hammer.js.
	Movable.apply(this, arguments);
	// Default key and touch maps
	// rolling the view
	this.key_map[this.KEYS['<']] = {which: 2, amount: -1};
	this.key_map[this.KEYS['>']] = {which: 2, amount: 1};
	// zooming (gecko has had some weird keycodes)
	this.key_map[189] = this.key_map[173] = this.key_map[109] =
		{which: 3, amount: -1};
	this.key_map[187] = this.key_map[61] = this.key_map[107] =
		{which: 3, amount: 1};
	this.touch_map = {
		'pan_x': {which: 0, speed: -1},
		'pan_y': {which: 1, speed: -1},
		'rotate': {which: 2, speed: 1},
		'pinch': {which: 3, speed: 1},
	};
	// Status variables
	this.last_hammer_event = null;
	this.is_hammer_busy = false;
	this.zoom_center = null;
	this.cos = 1;
	this.sin = 0;
	this.position[2] = this.position[3] = 0;
	this.velocity[2] = this.velocity[3] = 0;
};

MovableTouch.prototype = Object.create(Movable.prototype);
(function () {
	this.options = this.options || {};
	this.options.pan = {threshold: 0, pointers: 0};
	this.options.rotate = {threshold: 0};
	this.options.pinch = {threshold: 0};
	this.bindTouch = function (element) {
		var h = this.hammer;
		if (!this.hammer) {
			h = this.hammer = new Hammer.Manager($(element)[0]);
			h.add(new Hammer.Pan(this.options.pan));
			h.add(new Hammer.Rotate(this.options.rotate
				).recognizeWith(h.get('pan')));
			h.add(new Hammer.Pinch(this.options.pinch
				).recognizeWith([h.get('pan'), h.get('rotate')]));
		}
		var t = this;
		this.hammer.on('pan rotate pinch', function (e) {
			last = t.last_hammer_event || e;
			// Avoid sudden jumps when a finger is added or removed
			if (last.pointers.length == e.pointers.length) {
				var dt = e.deltaTime - last.deltaTime;
				if (dt) { // Only move if this isn't a duplicate event
					// Clamp incremental rotations to [-90, 90];
					// interpret obtuse rotations as swapped fingers.
					// Incremental scaling is clamped for continuity.
					var pan_x = e.deltaX - last.deltaX;
					var pan_y = e.deltaY - last.deltaY;
					var rot = (540 + e.rotation - last.rotation) % 360 - 180;
					if (Math.abs(rot) > 90) { rot += 180; }
					rot = ((180 + rot) % 360 - 180) * Math.PI / 180;
					var scl = e.scale / last.scale;
					if (!(scl > 0.1 && scl < 10)) { scl = 1; }
					// Move
					t.movePan(pan_x, pan_y);
					t.moveRotate(rot);
					t.movePinch(scl);
					// Set coasting velocities averaging over the last 100ms
					var weight = Math.min(1, 0.01 * dt);
					t.touchVelocity('pan_x', pan_x / dt, weight);
					t.touchVelocity('pan_y', pan_y / dt, weight);
					t.touchVelocity('rotate', rot / dt, weight);
					t.touchVelocity('pinch', (scl - 1) / dt, weight);
				}
			}
			if (!e.isFinal) { t.is_hammer_busy = true; }
			t.last_hammer_event = e;
			t.decay_rate = t.decay_coast;
			t.motionCallback();
		});
		$(element).on('wheel DOMMouseScroll mousewheel', function (e) {
			// Mousewheel zooming
			e = e.originalEvent;
			if (!(isNaN(e.pageX))) { t.zoom_center = [e.pageX, e.pageY]; }
			var delta_y = e.wheelDelta || (-e.detail);
			if (Math.abs(delta_y) > 20) { delta_y /= 120; }
			t.decay_rate = t.decay_coast;
			t.touchVelocity('pinch', delta_y);
			t.motionCallback();
		});
		$(window).on('mouseup touchcancel touchend mouseleave touchleave',
			function (e) {
				if (!e.relatedTarget) { t.touchEnd(); }
			});
	};
	this.bindKeyboard = function (element) {
		var t = this;
		Movable.prototype.bindKeyboard.apply(this, arguments);
		$(element).on('keydown.mKeyboard', function (e) {
			t.zoom_center = null;
		});
	};
	this.isMoving = function () {
		if (this.is_hammer_busy) { return false; }
		return Movable.prototype.isMoving.apply(this, arguments);
	};
	this.movePan = function (x, y) {
		this.position[this.touch_map.pan_x.which] -= this.cos * x + this.sin * y;
		this.position[this.touch_map.pan_y.which] -= -this.sin * x + this.cos * y;
	};
	this.moveRotate = function (angle) {
		this.position[this.touch_map.rotate.which] += angle;
	};
	this.movePinch = function (scale) {
		this.position[this.touch_map.pinch.which] += (1 - scale);
	};
	this.moveReset = function () {
		Movable.prototype.moveReset.call(this);
		this.cos = 1;
		this.sin = 0;
	};
	this.touchEnd = function () {
		this.last_hammer_event = null;
		this.is_hammer_busy = false;
	};
	this.touchVelocity = function (key, value, weight) {
		key = this.touch_map[key];
		if (arguments.length > 1) {
			if (isNaN(weight)) { weight = 1; }
			this.velocity[key.which] *= 1 - weight;
			this.velocity[key.which] += weight * value * key.speed;
		}
		return this.velocity[key];
	};
}).call(MovableTouch.prototype);

return MovableTouch;
})();
