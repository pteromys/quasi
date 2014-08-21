var BaseVertex = function (indices, representation) {
	this.indices = indices.slice();
	this.coords = M.mul(representation.BASIS, indices);
	this.is_fundamental = representation.isFundamental(this.coords);
	this.v_shrunk = null;
	this.v_grown = null;
	/* At minimum, compute this.weight */
};
BaseVertex.prototype = {
	isAcceptableDirection: function () { return true; },
};


// The quasilattice
var QuasiLattice = function (representation, VertexType) {
	this.rep = representation;
	this.Vertex = VertexType;
	this.verts = [];
	this.border_verts = new Heap([], this.vertCmp);
	this.vert_names = {};
	this.directions = [];
	this.start_index_shrink = 0;
	this.start_index_grow = 0;
	this.addVertSymmetric(V.zero(this.rep.DIMENSION));
	this.addVertSymmetric(this.rep.CYCLIC_ELEMENT);
};

QuasiLattice.prototype = {
	vertCmp: function (a, b) { return a.weight < b.weight; },
	createVert: function (indices) {
		nv = new this.Vertex(indices, this.rep);
		this.verts.push(nv);
		if (nv.is_fundamental) {
			this.border_verts.push(nv);
		}
		return nv;
	},
	addVert: function (indices) {
		var name = indices.join(' ');
		var nv = this.vert_names[name];
		if (nv) { return nv; }
		nv = this.createVert(indices);
		this.vert_names[name] = nv;
		return nv;
	},
	addVertSymmetric: function (indices) {
		if (this.vert_names[indices.join(' ')]) { return false; }
		for (var i = 0; i < this.rep.GROUP.length; i++) {
			this.addVert(this.rep.act(i, indices));
		}
	},
	addVerts: function () {
		var v = this.border_verts.pop();
		if (!v) { return false; }
		if (v.isAcceptableDirection()) {
			for (var i = 0; i < this.rep.GROUP.length; i++) {
				var nd = this.vert_names[this.rep.act(i, v.indices).join(' ')];
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
		if (!this.rep.actShrink) { return; }
		var limit = this.verts.length;
		for (var i = this.start_index_shrink; i < limit; i++) {
			if (!this.verts[i].v_shrunk) {
				this.verts[i].v_shrunk = this.addVert(this.rep.actShrink(this.verts[i].indices));
				this.verts[i].v_shrunk.v_grown = this.verts[i];
			}
		}
		this.start_index_shrink = limit;
	},
	addVertsGrow: function () {
		var limit = this.verts.length;
		if (!this.rep.actGrow) { return; }
		for (var i = this.start_index_grow; i < limit; i++) {
			if (!this.verts[i].v_grown) {
				this.verts[i].v_grown = this.addVert(this.rep.actExpand(this.verts[i].indices));
				this.verts[i].v_grown.v_shrunk = this.verts[i];
			}
		}
		this.start_index_grow = limit;
	},

};


var Representation = function (data) {
	for (var key in data) { this[key] = data[key]; }
	this.test();
	// Set up coefficients for scaling operations.
	if (this.SCALE_FACTORS && this.SCALE_FACTORS.length) {
		var base = Math.log(this.SCALE_FACTORS[0]);
		if (base > this.EPSILON) {
			this.SCALE_POWERS = this.SCALE_FACTORS.map(function (x) {
				return Math.log(Math.abs(x)) / base;
			});
		}
	}
	return this;
};
Representation.prototype = {
	EPSILON: 1e-9,
	GROUP_IS_MATRIX_LIST: false,
	SCALE_FACTORS: null,

	test: function () {
		var ortho_error = this.testBasis();
		if (ortho_error) {
			// If you want your representation to allow a non-orthogonal
			// basis, set its testBasis property to a function that returns
			// falsy values when everything is okay and an error message
			// otherwise.
			throw ortho_error;
		}
		if (this.GROUP_IS_MATRIX_LIST) {
			var group_error = this.testGroupMatrices();
			if (group_error) {
				throw 'Symmetry check failed at ' + group_error.join(', ') + '.';
			}
		}
	},
	testBasis: function () {
		// Test basis for orthogonality (but not length!)
		var b = this.BASIS;
		var EPSILON = this.EPSILON || 1e-9;
		var NORM = this.BASIS_NORM_SQUARED || 1;
		var id = function (i, j) {
			if (i == j) { return NORM; } else { return 0; }
		};
		for (var i = 0; i < b.length; i++) {
			for (var j = 0; j < b.length; j++) {
				if (!(Math.abs(V.dot(b[i], b[j]) - id(i,j)) < EPSILON)) {
					return 'Angle check failed at ' + i + ', ' + j + '.';
				}
			}
		}
		return false;
	},
	testGroupMatrices: function () {
		// Test group for no duplicates and correct matrix sizes.
		// To enable this test, set data.GROUP_IS_MATRIX_LIST = true.
		var d = this.DIMENSION;
		for (var i = 0; i < this.GROUP.length; i++) {
			var a = this.GROUP[i];
			// Test for matrix sizes
			if (!a || (a.length != d)) { return i; }
			for (var y = 0; y < d; y++) {
				if (!a[y] || (a[y].length != d)) { return [i]; }
			}
			// Test for duplicates
			for (var j = 0; j < i; j++) {
				var b = this.GROUP[j];
				var different = false;
				for (var y = 0; y < d; y++) {
					for (var x = 0; x < d; x++) {
						if (a[y][x] != b[y][x]) { different = true; }
					}
				}
				if (!different) { return [i, j]; }
			}
		}
		return false;
	},
};

