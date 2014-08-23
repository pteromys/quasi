importScripts('heap.js', 'linear.js', 'quasilattice.js', 'cyclic.js');

// Global variables because I haven't figured out where to put them
self.options = {
	n: null,
	r: 5,
};
self.lattice = null;
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
	var rep = new Representation(Cyclic(n));
	// Some constants
	this.n = n;
	this.radius = 5;
	this.dotsize = 0.05 * this.radius;
	rep.variance = Math.pow((rep.DIMENSION_HIDDEN + 3) / (Math.pow(5 * this.dotsize, 4)), 1/rep.DIMENSION_HIDDEN) * 0.5 / Math.PI;
	QuasiLattice.call(this, rep, Vertex);
};
QuasiLattice2.prototype = Object.create(QuasiLattice.prototype);

self.render = function (source) {
	if (!self.active) { return; }
	source = source || 'render';
	self.lattice.verts.sort(function (a, b) { return a.weight - b.weight; });
	self.postMessage({
		type: 'update',
		"source": source,
		data: self.lattice.verts.map(function (x) {
			return x.coords;
		}),
		translators: self.lattice.directions.map(function (x) {
			return x.coords;
		}),
		next_weight: self.lattice.border_verts.first().weight,
		next_radius: self.lattice.border_verts.first().r2,
		variance: self.lattice.rep.variance,
		dotsize: self.lattice.dotsize,
		radius: self.lattice.radius,
	});
};

self.onmessage = function (e) {
	var data = e.data;
	if (data.type == 'exit') {
		self.close();
	} else if (data.type == 'setSymmetry') {
		if (self.options.n != data.n) {
			self.options.n = data.n;
			try {
				var l = new QuasiLattice2(self.options.n, self.options.r);
				self.lattice = l;
				self.postMessage({
					type: 'init',
					dim_hidden: self.lattice.rep.DIMENSION_HIDDEN,
					scale_factors: self.lattice.rep.SCALE_FACTORS,
					scale_defect: self.lattice.rep.SCALE_DEFECT,
				});
				self.render();
			} catch (error_message) {
				self.postMessage({
					type: 'message',
					message: error_message + ' Operation canceled.',
					message_class: 'error',
					source: data.type,
				});
			}
		}
	} else if (data.type == 'addVerts' && self.lattice) {
		self.lattice.addVerts();
		self.render();
	} else if (data.type == 'render') {
		self.render();
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
