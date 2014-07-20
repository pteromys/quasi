importScripts('heap.js', 'linear.js', 'icos.js');

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

// Vertices
var Vertex = function (indices) {
	this.indices = indices.slice();
	this.coords = M.mul(Icos.BASIS, indices);
	this.is_fundamental = Icos.isFundamental(this.coords);
	var c = this.coords;
	this.r2 = c[0]*c[0] + c[1]*c[1] + c[2]*c[2];
	this.d2 = c[3]*c[3] + c[4]*c[4] + c[5]*c[5];
	this.weight = this.r2 + this.d2;
};

// The quasilattice
var QuasiLattice3 = function () {
	this.verts = [];
	this.glData = [];
	this.border_verts = new Heap([], this.vertCmp);
	this.vert_names = {};
	this.directions = [];
	this.direction_threshold = Infinity;
	this.addVertSymmetric([0,0,0,0,0,0]);
	this.direction_threshold = Infinity;
	this.addVertSymmetric([1,0,0,0,0,0]);
};
QuasiLattice3.prototype = {
	vertCmp: function (a, b) { return a.weight < b.weight; },
	addVert: function (indices) {
		var name = indices.join(' ');
		if (this.vert_names[name]) { return false; }
		var nv = new Vertex(indices);
		this.verts.push(nv);
		this.vert_names[name] = nv;
		if (Icos.isFundamental(nv.coords)) {
			this.border_verts.push(nv);
		}
		this.glData.push(nv.coords[0], nv.coords[1], nv.coords[2],
			nv.coords[3], nv.coords[4], nv.coords[5]);
		return nv;
	},
	addVertSymmetric: function (indices) {
		var dt = this.direction_threshold;
		for (var i = 0; i < Icos.GROUP.length; i++) {
			var nv = this.addVert(M.mul(Icos.GROUP[i], indices));
			if (nv) {
				if (nv.d2 < dt + EPSILON) {
					this.directions.push(nv);
					this.direction_threshold = nv.d2;
					new_direction = true;
				}
			}
		}
	},
	addVerts: function (v) {
		if (!v) {
			v = this.border_verts.pop();
			if (!v) { return false; }
		}
		var nv;
		var c = this.verts.length;
		for (var i = 1; i < this.directions.length; i++) {
			nv = V.add(v.indices, this.directions[i].indices);
			this.addVertSymmetric(nv);
		}
		return this.verts.length - c;
	},
	addVertsByTransform: function (shrink, grow) {
		shrink = shrink || 0;
		grow = grow || 1;
		var limit = this.verts.length;
		// Set up matrices to transform by
		var mats = [];
		var t = Icos.M_SHRINK;
		for (var j = 1; j <= shrink; j++) {
			mats.push(t);
			t = M.mulMats(Icos.M_SHRINK, t);
		}
		t = Icos.M_EXPAND;
		for (var j = 1; j <= grow; j++) {
			mats.push(t);
			t = M.mulMats(Icos.M_EXPAND, t);
		}
		// Add verts
		for (var i = 0; i < limit; i++) {
			if (this.verts[i].is_fundamental) {
				for (var j = 0; j < mats.length; j++) {
					this.addVertSymmetric(M.mul(mats[j], this.verts[i].indices));
				}
			}
		}
	},
	findTranslator: function (scale, origin, color) {
		s2 = scale * scale;
		function dirNiceness(v) {
			var x = V.add(v.coords.slice(0,3), origin);
			var y = V.add(v.coords.slice(3,6), color);
			x = V.dot(x, x) * s2;
			y = V.dot(y, y) / s2;
			return x + y;
		}
		var new_niceness = Infinity;
		var niceness = Infinity;
		var dir = this.directions[0];
		for (var i = 0; i < this.directions.length; i++) {
			new_niceness = dirNiceness(this.directions[i]);
			if (new_niceness < niceness) {
				dir = this.directions[i];
				niceness = new_niceness;
			}
		}
		return dir;
	},
};

self.lattice = new QuasiLattice3();
self.render = function () {
	self.postMessage({
		type: 'update',
		glData: new Float32Array(self.lattice.glData),
		num_verts: self.lattice.verts.length,
	});
};

self.onmessage = function (e) {
	var data = e.data;
	if (data.type == 'exit') {
		self.close();
	} else if (data.type == 'addVerts') {
		var n = data.iterations || 1;
		for (var i = 0; i < n; i++) {
			self.lattice.addVerts();
		}
		self.render();
	} else if (data.type == 'addVertsByTransform') {
		self.lattice.addVertsByTransform(data.shrink, data.grow);
		self.render();
	} else if (data.type == 'reCenter') {
		var d = self.lattice.findTranslator(data.scale, data.origin, data.color);
		self.postMessage({
			type: 'translation',
			origin: d.coords.slice(0, 3),
			color: d.coords.slice(3, 6),
		});
	} else {
		self.postMessage({
			type: 'message',
			message: 'Discarded message of type: ' + data.type,
			destination: data.destination,
			source: data.source,
		});
	}
};
