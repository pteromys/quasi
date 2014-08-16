importScripts('heap.js', 'linear.js', 'icos.js', 'quasilattice.js');

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
var Vertex = function (indices, icos) {
	BaseVertex.call(this, indices, icos);
	var c = this.coords;
	this.r2 = c[0]*c[0] + c[1]*c[1] + c[2]*c[2];
	this.d2 = c[3]*c[3] + c[4]*c[4] + c[5]*c[5];
	var s2 = 0.5 * this.d2 / VARIANCE;
	s2 = Math.max(MIN_S2, Math.min(s2, MAX_S2));
	this.weight = this.r2 * s2 * Math.max(1,
		Math.exp(0.5 * (this.d2 - FUZZ_D2) / (VARIANCE * s2)));
};
Vertex.prototype = Object.create(BaseVertex.prototype);
Vertex.prototype.isAcceptableDirection = function () {
	return this.d2 < 1.1 && this.r2 < DIRECTION_MAX_R2;
};

// The quasilattice
var QuasiLattice3 = function () {
	this.glData = [];
	QuasiLattice.call(this, Icos, Vertex);
};
QuasiLattice3.prototype = Object.create(QuasiLattice.prototype);
QuasiLattice3.prototype.createVert = function (indices) {
	var nv = QuasiLattice.prototype.createVert.call(this, indices);
	for (var i = 0; i < 6; i++) {
		Array.prototype.push.apply(this.glData, nv.coords);
		this.glData.push(CORNERS[i][0], CORNERS[i][1]);
		Array.prototype.push.apply(this.glData, floatToTriple(this.verts.length));
	}
	return nv;
}

self.lattice = new QuasiLattice3();
self.active = true;
self.render = function (source) {
	if (!self.active) { return; }
	source = source || 'render';
	self.postMessage({
		type: 'update',
		"source": source,
		glData: new Float32Array(self.lattice.glData),
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
