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
		for (var i = this.start_index_grow; i < limit; i++) {
			if (!this.verts[i].v_grown) {
				this.verts[i].v_grown = this.addVert(this.rep.actExpand(this.verts[i].indices));
				this.verts[i].v_grown.v_shrunk = this.verts[i];
			}
		}
		this.start_index_grow = limit;
	},
};
