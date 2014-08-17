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
	rep.variance = Math.pow(this.n / (Math.pow(5 * this.dotsize, 4)), 1/(this.n - 3)) * 0.5 / Math.PI;
	/*this.r2 = this.radius * this.radius;
	this.achieved_radius = false;
	this.weight_threshold = Math.pow(Math.sqrt(-4 * Math.log(this.radius/100)) - 1, 2);*/
	QuasiLattice.call(this, rep, Vertex);
	// Translation
	this.offset = this.verts[0];
};
QuasiLattice2.prototype = Object.create(QuasiLattice.prototype);
QuasiLattice2.prototype.draw = function (context, xy_view, offset, scale) {
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
};
QuasiLattice2.prototype.render = function (start_at) {
	var scale = (screen_state.radius || 200) / this.radius;
	var cull_scale = -4 * this.rep.variance * Math.log(0.5 / (this.dotsize * scale));
	var data = new Float64Array(3 * this.verts.length);
	var index = 0;
	for (var j = start_at || 0; j < this.verts.length; j++) {
		// Compute sizes
		if (Math.abs(this.verts[j].xy[0]) > 1.5 * this.radius) { continue; }
		if (Math.abs(this.verts[j].xy[1]) > 1.5 * this.radius) { continue; }
		// This can be slightly optimized using the binomial theorem.
		var scl = V.add(this.verts[j].displacement, this.offset.displacement);
		scl = V.dot(scl, scl);
		if (scl > cull_scale) { continue; }
		this.verts[j].was_seen = true;
		scl = this.dotsize * Math.exp(-0.25 * scl / this.rep.variance);
		// Draw
		data[index++] = this.verts[j].xy[0];
		data[index++] = this.verts[j].xy[1];
		data[index++] = scl;
	}
	return data.subarray(0, index);
};
QuasiLattice2.prototype.reTranslate = function (xy) {
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
		this.offset = new Vertex(V.add(this.offset.indices, translator.indices), this.rep);
		return true;
	} else {
		return false;
	}
};
QuasiLattice2.prototype.wantsMoreVerts = function () {
	return this.verts.length < 1000;
	if (!this.border_verts.first()) { return false; }
	if (this.achieved_radius) {
		return this.border_verts.first().weight() <= this.weight_threshold;
	}
	return true;
};

self.reRender = function (start_at) {
	self.postMessage({
		type: 'render',
		points: lattice.render(start_at),
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
			self.lattice = new QuasiLattice2(options.n, options.r);
		}
	} else if (data.type == 'setRadius') {
		screen_state.radius = data.radius;
		self.reRender();
	} else if (data.type == 'addVerts') {
		self.lattice.addVerts();
		self.reRender();
		if (self.lattice.wantsMoreVerts()) {
			self.postMessage({type: 'vertRequest', count: self.lattice.verts.length});
		}
	} else if (data.type == 'render') {
		self.reRender();
	} else if (data.type == 'moveReset') {
		self.lattice.offset = self.lattice.verts[0];
		self.reRender();
	} else if (data.type == 'reTranslate') {
		if (self.lattice.reTranslate(data.xy)) { self.reRender(); }
		self.postMessage({type: 'translationDone'});
	} else {
		self.postMessage({
			type: 'message',
			message: 'Discarded message of type: ' + data.type,
			destination: data.destination,
			source: data.source,
		});
	}
};
