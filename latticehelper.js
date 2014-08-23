var LatticeHelper = (function () {

var LatticeHelper = function (dimension, visibles, translators, scale_factors) {
	this.dimension = dimension;
	this.dimension_visible = visibles;
	this.dimension_hidden = dimension - visibles;
	this.translators = translators;
	this.scale_factors = scale_factors;
	if (scale_factors) {
		this.log_factors = scale_factors.map(function (row) {
			return row.map(function (x) { return Math.log(Math.abs(x)); });
		});
		this.scale_distortion = Math.exp(Math.sqrt(
			V.dot(this.log_factors[0], this.log_factors[0])));
	}
	this.reset();
};

LatticeHelper.prototype = {
	renderPoint: function (coords, into) {
		into = into || [];
		var offset = this.offset;
		var d2 = 0;
		var d = 0;
		for (var i = 0; i < this.dimension_visible; i++) {
			into[i] = (coords[i] + offset[i]) * this.scale[i];
		}
		for (var i = this.dimension_visible; i < this.dimension; i++) {
			d = (coords[i] + offset[i]) * this.scale[i];
			d2 += d * d;
		}
		into[this.dimension_visible] = d2;
		return into;
	},
	reset: function () {
		this.offset = V.zero(this.dimension);
		this.log_scale = this.offset.slice();
		this.scale = this.offset.map(function () { return 1; });
	},
	recenter: function () {
		if (this.disable_recentering) { return; }
		var t = this;
		var store = new Array(this.dimension_visible + 1);
		function dirNiceness(v) {
			t.renderPoint(v, store);
			var x = 0;
			for (var i = 0; i < t.dimension_visible; i++) {
				x += store[i] * store[i];
			}
			return x + 9 * store[t.dimension_visible];
		}
		var new_niceness = Infinity;
		var niceness = Infinity;
		if (this.translators.length) {
			var dir = this.translators[0];
			for (var i = 0; i < this.translators.length; i++) {
				new_niceness = dirNiceness(this.translators[i]);
				if (new_niceness < niceness) {
					dir = this.translators[i];
					niceness = new_niceness;
				}
			}
			if (dir != this.translators[0]) {
				V.addInPlace(this.offset, dir);
			}
		}
	},
	zoom: function (amount) {
		if (!this.scale_factors) { return; }
		if (!amount) { return; }
		if (!(Math.abs(amount) < 3)) { return; }
		var s = Math.exp(amount);
		var lsi = -amount * this.dimension_visible / this.dimension_hidden;
		var si = Math.exp(lsi);
		for (var i = 0; i < this.dimension_visible; i++) {
			this.scale[i] *= s;
			this.log_scale[i] += amount;
		}
		for (var i = this.dimension_visible; i < this.dimension; i++) {
			this.scale[i] *= si;
			this.log_scale[i] += lsi;
		}
	},
	zoomAdjust: function () {
		if (!this.scale_factors) { return; }
		var v_tmp = V.zero(this.dimension);
		var best = V.dot(this.log_scale, this.log_scale);
		var i_best = -1;
		var changed = false;
		for (var i = 0; i < this.scale_factors.length; i++) {
			var t = V.sum2(this.log_factors[i], this.log_scale);
			if (t < best) {
				best = t;
				i_best = i;
				changed = true;
			}
		}
		if (changed) {
			for (var i = 0; i < this.dimension; i++) {
				this.offset[i] /= this.scale_factors[i_best][i];
				this.scale[i] *= this.scale_factors[i_best][i];
				this.log_scale[i] += this.log_factors[i_best][i];
			}
		}
	},
};

return LatticeHelper;
})();
