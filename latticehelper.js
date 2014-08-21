var LatticeHelper = (function () {

var LatticeHelper = function (dimension, visibles, translators, scale_factors) {
	this.dimension = dimension;
	this.dimension_visible = visibles;
	this.translators = translators;
	this.scale_factors = scale_factors;
	// Set up coefficients for scaling operations.
	if (this.scale_factors && this.scale_factors.length) {
		var base = Math.log(this.scale_factors[0]);
		if (base > 1e-9) {
			this.scale_powers = this.scale_factors.map(function (x) {
				return Math.log(Math.abs(x)) / base;
			});
		}
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
		if (!this.scale_powers) { return; }
		if (!amount) { return; }
		if (!(Math.abs(amount) < 3)) { return; }
		for (var i = 0; i < this.dimension; i++) {
			this.scale[i] *= Math.exp(amount * this.scale_powers[i]);
		}
	},
	zoomAdjust: function () {
		if (!this.scale_factors) { return; }
		var s2 = this.scale[0] * this.scale[0];
		if (s2 > this.scale_factors[0]) {
			for (var i = 0; i < this.dimension; i++) {
				this.offset[i] *= this.scale_factors[i];
				this.scale[i] /= this.scale_factors[i];
			}
		} else if (s2 * this.scale_factors[0] < 1) {
			for (var i = 0; i < this.dimension; i++) {
				this.offset[i] /= this.scale_factors[i];
				this.scale[i] *= this.scale_factors[i];
			}
		}
	},
};

return LatticeHelper;
})();
