importScripts('heap.js', 'linear.js', 'cyclic.js', 'quasilattice.js');

// Global variables because I haven't figured out where to put them
var options = {
	n: null,
	r: 5,
};
var lattice = null;
var screen_state = {
	radius: 1000,
};
self.active = true;

// Constants
var EPSILON = 1e-9;

var Vertex = function (indices, rep) {
	BaseVertex.call(this, indices, rep);
	this.xy = this.coords.slice(0,2);
	this.displacement = this.coords.slice(2);
	this.r2 = V.dot(this.xy, this.xy);
	this.d2 = V.dot(this.displacement, this.displacement);
	this.nd2 = this.d2 / rep.variance;
	this.weight = (1 + this.r2) * Math.exp(0.5 * this.nd2);
};
Vertex.prototype = Object.create(BaseVertex.prototype);
Vertex.prototype.isAcceptableDirection = function () {
	return true; //return this.d2 < 1.1 && this.r2 < DIRECTION_MAX_R2;
};

var QuasiLattice2 = function (n) { // n = degree of symmetry
	if (n < 2) { n = 2; }
	var rep = Cyclic(n);
	// Some constants
	this.n = n;
	this.radius = 5; //target_radius || 5;
	this.dotsize = 0.05 * this.radius;
	rep.variance = Math.pow((rep.DIMENSION_HIDDEN + 3) / (Math.pow(5 * this.dotsize, 4)), 1/rep.DIMENSION_HIDDEN) * 0.5 / Math.PI;
	/*this.r2 = this.radius * this.radius;
	this.achieved_radius = false;
	this.weight_threshold = Math.pow(Math.sqrt(-4 * Math.log(this.radius/100)) - 1, 2);*/
	QuasiLattice.call(this, rep, Vertex);
	// Translation
	this.offset = this.verts[0];
};
QuasiLattice2.prototype = Object.create(QuasiLattice.prototype);
QuasiLattice2.prototype.wantsMoreVerts = function () {
	return this.verts.length < 1000;
	if (!this.border_verts.first()) { return false; }
	if (this.achieved_radius) {
		return this.border_verts.first().weight() <= this.weight_threshold;
	}
	return true;
};

self.render = function (source) {
	if (!self.active) { return; }
	source = source || 'render';
	self.lattice.verts.sort(function (a, b) { return a.weight - b.weight; });
	self.postMessage({
		type: 'update',
		"source": source,
		data: self.lattice.verts.map(function (x) {
			return [x.xy, x.displacement];
		}),
		translators: self.lattice.directions.map(function (x) {
			return [x.xy, x.displacement];
		}),
		next_weight: self.lattice.border_verts.first().weight,
		next_radius: self.lattice.border_verts.first().r2,
		variance: self.lattice.rep.variance,
		dim_hidden: self.lattice.rep.DIMENSION_HIDDEN,
		scale_powers: self.lattice.rep.SCALE_POWERS,
		scale_factors: self.lattice.rep.SCALE_FACTORS,
	});
};

self.onmessage = function (e) {
	var data = e.data;
	if (data.type == 'exit') {
		self.close();
	} else if (data.type == 'setSymmetry') {
		if (options.n != data.n) {
			options.n = data.n;
			self.lattice = new QuasiLattice2(options.n, options.r);
		}
	} else if (data.type == 'setRadius') {
		screen_state.radius = data.radius;
		self.render();
	} else if (data.type == 'addVerts') {
		self.lattice.addVerts();
		self.render();
	} else if (data.type == 'render') {
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
