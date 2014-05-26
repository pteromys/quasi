importScripts('heap.js');

// Global variables because I haven't figured out where to put them
var options = {
	n: null,
	r: 5,
};
var lattice = null;
var screen_state = {
	radius: 1000,
};

// Constants
var EPSILON = 1e-9;

// Vector and Matrix operations
var V = {
	dot: function (x, y) {
		var ans = 0;
		for (var i = Math.min(x.length, y.length) - 1; i >= 0; i--) {
			ans += x[i] * y[i];
		}
		return ans;
	},
	scale: function (v, a) {
		return v.map(function (x) { return x * a; });
	},
	add: function (x, y) {
		var ans = new Array(Math.min(x.length, y.length));
		for (var i = 0; i < ans.length; i++) {
			ans[i] = x[i] + y[i];
		}
		return ans;
	},
	zero: function (n) {
		var ans = new Array(n);
		for (var i = 0; i < n; i++) { ans[i] = 0; }
		return ans;
	},
	isZero: function (v) {
		for (var i = 0; i < v.length; i++) {
			if (v[i] != 0) {
				return false;
			}
		}
		return true;
	},
	rotate: function (v) {
		if (!v.length) { return; }
		var sw = v[0];
		for (var i = 0; i < v.length - 1; i++) {
			v[i] = v[i+1];
		}
		v[v.length - 1] = sw;
	},
};
var M = {
	mul: function (m, v) {
		var ans = V.zero(m.length);
		for (var i = 0; i < ans.length; i++) {
			for (var j = 0; j < v.length; j++) {
				ans[i] += m[i][j] * v[j];
			}
		}
		return ans;
	},
};
var Vertex = function (indices, quasilattice) {
	this.lattice = quasilattice;
	this.indices = indices.slice(); // Make a copy
	this.xy = quasilattice.xy(indices);
	this.displacement = quasilattice.displacement(indices, this.xy);
	this.xy2 = V.dot(this.xy, this.xy);
	this.d2 = V.dot(this.displacement, this.displacement);
	this.r2 = this.d2 / quasilattice.variance;
};
Vertex.prototype = {
	toString: function () {
		return this.indices.join(' ');
	},
	weight: function () {
		//return 0.2 * this.xy2 + this.d2;
		// Empirically, it doesn't seem necessary to go more than 3
		// standard deviations out in order to fill local space
		// with visibles. Visible threshold, set arbitrarily at dot size/50,
		// is at sqrt(-4 ln 0.02), approximately 3.956.
		// To go down to 1/100th of dot size is about 4.292.
		return 2 * this.xy2 / this.lattice.r2 + this.r2;
	},
};
var QuasiLattice = function (n, target_radius) { // n = degree of symmetry
	if (n < 2) { n = 2; }
	this.n = n;
	this.radius = target_radius || 5;
	this.r2 = this.radius * this.radius;
	this.achieved_radius = false;
	this.weight_threshold = Math.pow(Math.sqrt(-4 * Math.log(this.radius/100)) - 1, 2);
	// Some constants
	this.dotsize = 0.04 * this.radius;
	this.variance = Math.pow(this.n / (Math.pow(5 * this.dotsize, 4)), 1/(this.n - 3)) * 0.5 / Math.PI;
	// 2D basis elements
	this.x = V.zero(n);
	this.y = V.zero(n);
	var norm = Math.sqrt(2/n);
	if (n == 2) { norm = Math.sqrt(0.5); }
	for (var i = 0; i < n; i++) {
		this.x[i] = Math.cos(2 * Math.PI * i / n) * norm;
		this.y[i] = Math.sin(2 * Math.PI * i / n) * norm;
	}
	if (n % 2) {
		this.cot = 1/Math.tan(Math.PI / n);
	} else if (n == 2) {
		this.cot = -1; // Actual value is -Infinity but we don't need it.
	} else {
		this.cot = 1/Math.tan(2 * Math.PI / n);
	}
	// Vertex list
	this.verts = [new Vertex(V.zero(n), this)];
	this.border_verts = new Heap(this.verts, this.vertCmp);
	this.vert_names = {};
	this.vert_names[this.verts[0].toString()] = this.verts[0];
	// Set up translation directions
	this.directions = new Array(2*n);
	for (var i = 0; i < n; i++) {
		this.directions[i] = V.zero(n);
		this.directions[i][i] = 1;
		this.directions[i][(i+1)%n] = -1;
		this.directions[i+n] = V.zero(n);
		this.directions[i+n][i] = -1;
		this.directions[i+n][(i+1)%n] = 1;
	}
	for (var i = 0; i < this.directions.length; i++) {
		this.directions[i] = new Vertex(this.directions[i], this);
	}
	this.direction_threshold = Infinity;
	// Translation
	this.offset = this.verts[0];
};
QuasiLattice.prototype = {
	displacement: function (indices, xy) {
		var v = indices.slice();
		for (var i = 0; i < v.length; i++) {
			v[i] -= this.x[i] * xy[0] + this.y[i] * xy[1];
		}
		return v;
	},
	xy: function (indices) {
		return [V.dot(this.x, indices), V.dot(this.y, indices)];
	},
	vertCmp: function (a, b) {
		return (a.weight() < b.weight());
	},
	addVerts: function (v) {
		// Search through neighbors of a border vertex v.
		// Automatically select v from the queue if not given.
		if (!v) {
			v = this.border_verts.pop();
			if (!v) { return false; }
		}
		var nv;
		for (var i = 0; i < this.directions.length; i++) {
			nv = this.addVertSymmetric(V.add(v.indices, this.directions[i].indices));
		}
		return true;
	},
	addVert: function (indices) {
		if (this.vert_names[indices.join(' ')]) { return false; }
		var nv = new Vertex(indices, this);
		this.verts.push(nv);
		this.vert_names[nv.toString()] = nv;
		if (nv.xy[0] > -EPSILON && nv.xy[1] >= this.cot * nv.xy[0]) {
			this.border_verts.push(nv);
		}
		if (nv.weight() < this.direction_threshold + EPSILON) {
			this.directions.unshift(nv);
			if (nv.weight() < this.direction_threshold - EPSILON) {
				this.direction_threshold = nv.weight();
			}
		}
		if (nv) {
			if (!this.achieved_radius && nv.xy2 > this.r2) {
				this.achieved_radius = nv.indices;
			};
		}
		return nv;
	},
	addVertSymmetric: function (indices) {
		var nv;
		for (var i = 0; i < this.n; i++) {
			nv = this.addVert(indices);
			nv = this.addVert(indices.map(function (x) { return -x; }));
			V.rotate(indices);
		}
		return nv;
	},
	draw: function (context, xy_view, offset, scale) {
		// Set up context
		var m = context.canvas;
		var w = context.canvas.width = $(window).width();
		var h = context.canvas.height = $(window).height();
		var r = Math.sqrt(w*w + h*h)/2;
		context = context.canvas.getContext('2d');
		context.fillStyle = this.getGradient(context);
		context.globalCompositeOperation = 'lighter';
		context.translate(context.canvas.width/2, context.canvas.height/2);
		scale = (scale || 1) * r / this.radius;
		var cull = [0.5 * w / scale + this.dotsize,
			0.5 * h / scale + this.dotsize];
		var cull_scale = -4 * this.variance * Math.log(0.5 / (this.dotsize * scale));
		context.scale(scale, -scale);
		tracker.num_visible = 0;
		tracker.num_seen = 0;
		for (var j = 0; j < this.verts.length; j++) {
			// Compute
			if (this.verts[j].was_seen) { tracker.num_seen += 1; }
			var xy = V.add(xy_view, V.add(this.verts[j].xy, offset.xy));
			if (Math.abs(xy[0]) > cull[0] || Math.abs(xy[1]) > cull[1]) {
				continue;
			}
			var scl = V.add(this.verts[j].displacement, offset.displacement);
			scl = V.dot(scl, scl);
			if (scl > cull_scale) { continue; }
			tracker.num_visible += 1;
			this.verts[j].was_seen = true;
			scl = this.dotsize * Math.exp(-0.25 * scl / this.variance);
			// Draw
			context.save();
			context.translate(xy[0], xy[1]);
			context.scale(scl, scl);
			context.fillRect(-1, -1, 2, 2);
			context.restore();
		}
	},
	render: function () {
		var scale = (screen_state.radius || 200) / this.radius;
		var cull_scale = -4 * this.variance * Math.log(0.5 / (this.dotsize * scale));
		var data = new Float64Array(3 * this.verts.length);
		var index = 0;
		for (var j = 0; j < this.verts.length; j++) {
			// Compute sizes
			// This can be slightly optimized using the binomial theorem.
			var scl = V.add(this.verts[j].displacement, this.offset.displacement);
			scl = V.dot(scl, scl);
			if (scl > cull_scale) { continue; }
			this.verts[j].was_seen = true;
			scl = this.dotsize * Math.exp(-0.25 * scl / this.variance);
			// Draw
			data[index++] = this.verts[j].xy[0];
			data[index++] = this.verts[j].xy[1];
			data[index++] = scl;
		}
		return data.subarray(0, index);
	},
	reTranslate: function (xy) {
		var t = this;
		var cmpTranslators = function (a, b) {
			axy = V.add(xy, V.add(a.xy, t.offset.xy));
			ad = V.add(t.offset.displacement, a.displacement);
			bxy = V.add(xy, V.add(b.xy, t.offset.xy));
			bd = V.add(t.offset.displacement, b.displacement);
			axy = Math.max(0, V.dot(axy, axy) - 6.25);
			ad = V.dot(ad, ad);
			bxy = Math.max(0, V.dot(bxy, bxy) - 6.25);
			bd = V.dot(bd, bd);
			return (ad - bd) + (axy - bxy);
		};
		var translator = this.verts[0];
		for (var i = 0; i < this.directions.length; i++) {
			if (cmpTranslators(translator, this.directions[i]) > 0) {
				translator = this.directions[i];
			}
		}
		if (!V.isZero(translator.indices)) {
			this.offset = new Vertex(V.add(this.offset.indices, translator.indices), this);
			return true;
		} else {
			return false;
		}
	},
	wantsMoreVerts: function () {
		if (!this.border_verts.first()) { return false; }
		if (this.achieved_radius) {
			return this.border_verts.first().weight() <= this.weight_threshold;
		}
		return true;
	},
};

self.reRender = function () {
	self.postMessage({
		type: 'render',
		points: lattice.render(),
		offset: lattice.offset.xy,
	});
};

self.onmessage = function (e) {
	var data = e.data;
	if (data.type == 'exit') {
		self.close();
	} else if (data.type == 'setSymmetry') {
		if (options.n != data.n) {
			options.n = data.n;
			self.lattice = new QuasiLattice(options.n, options.r);
		}
	} else if (data.type == 'addVerts') {
		self.lattice.addVerts();
		self.reRender();
		if (self.lattice.wantsMoreVerts()) {
			self.postMessage({type: 'vertRequest', count: self.lattice.verts.length});
		}
	} else if (data.type == 'render') {
		self.reRender();
	} else if (data.type == 'reTranslate') {
		if (self.lattice.reTranslate(data.xy)) { self.reRender(); }
	} else {
		self.postMessage({
			type: 'message',
			message: 'Discarded message of type: ' + data.type,
			destination: data.destination,
			source: data.source,
		});
	}
};
