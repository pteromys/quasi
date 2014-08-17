// Various data on the cyclic group Z/n (n odd)
// and its regular representation on Z^n (by cycling the axes).
// We discard the trivial rep and only look at the augmentation ideal.

var Cyclic = function (n) {

// Cosine and sine
var CIS = (function () {
	var ans = [new Array(n), new Array(n)];
	ans[0][0] = 1;
	ans[1][0] = 0;
	for (var i = 1; i <= n/2; i++) {
		ans[0][n-i] = ans[0][i] = Math.cos(2 * Math.PI * i / n);
		ans[1][n-i] = -(ans[1][i] = Math.sin(2 * Math.PI * i / n));
	}
	return ans;
})();

var HALF_N = (n - 1) / 2;

// Basis for the representation.
// C^n has an eigenvector for each nth root of unity.
// We pair conjugate eigenvalues to get a real representation,
// and discard the trivial rep.
var CYCLIC_BASIS = (function () {
	var ans = new Array(n-1);
	var norm = Math.sqrt(2/n);
	for (var i = 0; i < n-1; i++) {
		ans[i] = new Array(n);
		var power = (i >> 1) + 1;
		for (var j = 0; j < n; j++) {
			ans[i][j] = CIS[i % 2][(power * j) % n] * norm;
		}
	}
	// For even n, the basis element is [1, -1, 1, -1, ...]
	// so we normalize by dividing by Math.sqrt(n), not Math.sqrt(n/2).
	if (n % 2 == 0) {
		ans[n-2] = V.scale(ans[n-2], Math.sqrt(0.5));
	}
	return ans;
})();

var Cyclic = {
	EPSILON: 1e-9,
	BASIS: CYCLIC_BASIS,
	DIMENSION: n,
	DIMENSION_VISIBLE: 2,
	CYCLIC_ELEMENT: (function () {
		var v = V.zero(n);
		v[0] = 1;
		v[1] = -1;
		return v;
	})(),
	testBasisOrthogonality: function () {
		// Self-test for orthogonality
		var id = function (i, j) { if (i == j) { return 1; } else { return 0; } };
		for (var i = 0; i < n-1; i++) {
			for (var j = 0; j < n-1; j++) {
				if (Math.abs(V.dot(this.BASIS[i], this.BASIS[j]) - id(i,j)) > 1e-9) {
					return [i, j];
				}
			}
		}
		return false;
	},

	// Test whether a point is in the fundamental domain
	// (coords in a fixed choice of eigenplane (i.e. the first))
	isFundamental: function (coords) {
		var x = coords[0];
		var y = coords[1];
		return x >= -this.EPSILON &&
			y >= CIS[1][1] * x + CIS[0][1] * y - this.EPSILON;
	},

	// Act on coordinates in Z^n, scaling the first eigenplane.
	// Unlike with the icosahedral group, except for n = 5
	// this won't scale the complement uniformly; otherwise the
	// scale factor's Galois conjugate(s) would appear too many times.
	// All we can guarantee is that these transformations preserve
	// the total volume: since the roots of unity sum to 0,
	// one can compute by distributing that
	//     \[  \prod_{k=0}^{n-1} (1 + \zeta^k) = 2 .  \]
	actExpand: function (v) {
		var ans = V.zero(n);
		for (var i = 0; i < n; i++) {
			ans[i] = 2 * v[i] + v[(i+1) % n] + v[(n+i-1) % n];
		}
		return ans;
	},
	actShrink: function (v) {
		var ans = V.zero(n);
		for (var i = 0; i < n; i++) {
			ans[i] = 2 * v[i] + v[(i+HALF_N) % n] + v[(n+i-HALF_N) % n];
		}
		return ans;
	},

	// The group action
	// Really this is the group along with the scalar -1.
	act: function (i, v) {
		var s = 1;
		if (i >= n) { s = -1; }
		var ans = new Array(n);
		for (var j = 0; j < n; j++) {
			ans[j] = s * v[(j + i) % n];
		}
		return ans;
	},
	GROUP: {
		length: 2 * n,
	},
};

return Cyclic;

};
