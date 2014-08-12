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

// Constants and math helpers
var EPSILON = 1e-9;
var CORNERS = [[0, 0], [1, 0], [0, 1], [1, 0], [0, 1], [1, 1]];
var i256 = 1/256;
var floatToTriple = function (x) {
	return [(x % 128)*i256, ((x >> 7) % 128)*i256, ((x >> 14) % 128)*i256];
};

// Parameters for weight computation
var VARIANCE = 0.4;
var FUZZ_D2 = 1;
var FUZZ_R2 = 1;
var MAX_S2 = Math.sqrt(5) + 2;
var MIN_S2 = Math.sqrt(5) - 2;

// Vertices
var Vertex = function (indices) {
	this.indices = indices.slice();
	this.coords = M.mul(Icos.BASIS, indices);
	this.is_fundamental = Icos.isFundamental(this.coords);
	var c = this.coords;
	this.r2 = c[0]*c[0] + c[1]*c[1] + c[2]*c[2];
	this.d2 = c[3]*c[3] + c[4]*c[4] + c[5]*c[5];
	var s2 = Math.max(MIN_S2, Math.min(0.5 * this.d2/VARIANCE, MAX_S2));
	this.weight = //Math.sqrt(this.r2) + this.d2 + Math.pow(this.d2 / 2.058, 3);
		this.r2 * s2 * Math.max(1, Math.exp(0.5 * (this.d2 - FUZZ_D2) / (VARIANCE * s2)));
};

// The quasilattice
var QuasiLattice3 = function () {
	this.verts = [];
	this.glData = [];
	this.border_verts = new Heap([], this.vertCmp);
	this.vert_names = {};
	this.directions = [];
	this.addVertSymmetric([0,0,0,0,0,0]);
	this.addVertSymmetric([1,0,0,0,0,0]);
};
QuasiLattice3.prototype = {
	vertCmp: function (a, b) { return a.weight < b.weight; },
	addVert: function (indices) {
		var name = indices.join(' ');
		var nv = this.vert_names[name];
		if (nv) { return nv; }
		nv = new Vertex(indices);
		this.verts.push(nv);
		this.vert_names[name] = nv;
		if (nv.is_fundamental) {
			this.border_verts.push(nv);
		}
		for (var i = 0; i < 6; i++) {
			Array.prototype.push.apply(this.glData, nv.coords);
			this.glData.push(CORNERS[i][0], CORNERS[i][1]);
			Array.prototype.push.apply(this.glData, floatToTriple(this.verts.length));
		}
		return nv;
	},
	addVertSymmetric: function (indices) {
		if (this.vert_names[indices.join(' ')]) { return false; }
		for (var i = 0; i < Icos.GROUP.length; i++) {
			this.addVert(M.mul(Icos.GROUP[i], indices));
		}
	},
	addVerts: function () {
		var v = this.border_verts.pop();
		if (!v) { return false; }
		if (v.d2 < 1.1 && v.r2 < 100) {
			for (var i = 0; i < Icos.GROUP.length; i++) {
				var nd = this.vert_names[M.mul(Icos.GROUP[i], v.indices).join(' ')];
				if (this.directions.indexOf(nd) < 0) {
					this.directions.push(nd);
				}
			}
		}
		var c = this.verts.length;
		for (var i = 1; i < this.directions.length; i++) {
			this.addVertSymmetric(V.add(v.indices, this.directions[i].indices));
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
};

self.lattice = new QuasiLattice3();
self.render = function () {
	self.postMessage({
		type: 'update',
		glData: new Float32Array(self.lattice.glData),
		num_verts: 6 * self.lattice.verts.length,
		translators: self.lattice.directions.filter(function (x) {
			return (x.r2 < 10);
		}).map(function (x) {
			return {origin: x.coords.slice(0,3), color: x.coords.slice(3,6),};
		}),
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
	} else {
		self.postMessage({
			type: 'message',
			message: 'Discarded message of type: ' + data.type,
			destination: data.destination,
			source: data.source,
		});
	}
};
