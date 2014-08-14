importScripts('heap.js', 'linear.js', 'icos.js');

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
var DIRECTION_MAX_R2 = 100;

// Vertices
var Vertex = function (indices) {
	this.indices = indices.slice();
	this.coords = M.mul(Icos.BASIS, indices);
	this.is_fundamental = Icos.isFundamental(this.coords);
	var c = this.coords;
	this.r2 = c[0]*c[0] + c[1]*c[1] + c[2]*c[2];
	this.d2 = c[3]*c[3] + c[4]*c[4] + c[5]*c[5];
	var s2 = 0.5 * this.d2 / VARIANCE;
	s2 = Math.max(MIN_S2, Math.min(s2, MAX_S2));
	this.weight = this.r2 * s2 * Math.max(1,
		Math.exp(0.5 * (this.d2 - FUZZ_D2) / (VARIANCE * s2)));
	this.v_shrunk = null;
	this.v_grown = null;
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
	this.start_index_shrink = 0;
	this.start_index_grow = 0;
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
		if (v.d2 < 1.1 && v.r2 < DIRECTION_MAX_R2) {
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
	addVertsShrink: function () {
		var limit = this.verts.length;
		for (var i = this.start_index_shrink; i < limit; i++) {
			if (!this.verts[i].v_shrunk) {
				this.verts[i].v_shrunk = this.addVert(M.mul(Icos.M_SHRINK, this.verts[i].indices));
				this.verts[i].v_shrunk.v_grown = this.verts[i];
			}
		}
		this.start_index_shrink = limit;
	},
	addVertsGrow: function () {
		var limit = this.verts.length;
		for (var i = this.start_index_grow; i < limit; i++) {
			if (!this.verts[i].v_grown) {
				this.verts[i].v_grown = this.addVert(M.mul(Icos.M_EXPAND, this.verts[i].indices));
				this.verts[i].v_grown.v_shrunk = this.verts[i];
			}
		}
		this.start_index_grow = limit;
	},
};

self.lattice = new QuasiLattice3();
self.active = true;
self.render = function (source) {
	if (!self.active) { return; }
	source = source || 'render';
	self.postMessage({
		type: 'update',
		"source": source,
		glData: new Float32Array(self.lattice.glData),
		num_verts: 6 * self.lattice.verts.length,
		translators: self.lattice.directions.filter(function (x) {
			return (x.r2 < 10);
		}).map(function (x) {
			return {origin: x.coords.slice(0,3), color: x.coords.slice(3,6),};
		}),
		next_weight: self.lattice.border_verts.first().weight,
	});
};

self.onmessage = function (e) {
	var data = e.data;
	if (data.type == 'exit') {
		self.close();
	} else if (data.type == 'abort') {
		self.active = false;
	} else if (data.type == 'addVerts') {
		var n = data.iterations || 1;
		for (var i = 0; i < n; i++) {
			self.lattice.addVerts();
		}
		self.render('neighbors');
	} else if (data.type == 'addVertsShrink') {
		self.lattice.addVertsShrink();
		self.render('shrink');
	} else if (data.type == 'addVertsGrow') {
		self.lattice.addVertsGrow();
		self.render('grow');
	} else {
		self.postMessage({
			type: 'message',
			message: 'Worker discarded message of type: ' + data.type,
			message_class: 'debug warning',
			destination: data.destination,
			source: data.source,
		});
	}
};
