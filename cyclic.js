// Various data on the cyclic group Z/n (n odd)
// and the faithful subrepresentation of its
// regular representation on Z^n (by cycling the axes).
// (The dimension of this is the totient of n.)

var Cyclic = function (n) {

var HALF_N = (n - 1) / 2;

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

// Factoring-related utils
var primeFactorList = (function (x) {
	var findFactor = function (i, x) {
		// Returns prime factors of x via a sieve, sorted ascending.
		var limit = Math.round(Math.sqrt(x));
		for (; i <= limit; i++) {
			if (x % i == 0) { return [i].concat(findFactor(i, x/i)); }
		}
		return [x];
	}
	return findFactor.bind(null, 2);
})();
var primeFactorSet = function (x) {
	var l = primeFactorList(x);
	var ans = [l[0]];
	for (var i = 1; i < l.length; i++) {
		if (l[i] != l[i-1]) { ans.push(l[i]); }
	}
	return ans;
};
var totient = function (x) {
	var l = primeFactorList(x);
	var prev = 0;
	var ans = 1;
	for (var i = 0; i < l.length; i++) {
		if (l[i] == prev) {
			ans *= l[i];
		} else {
			ans *= l[i] - 1;
		}
		prev = l[i];
	}
	return ans;
};

// Performance boost from this caching is negligible
// (the 5th Fermat number takes only 0.2ms to factor);
// I just like referring to the factors of n with capital letters.
var FACTORS = primeFactorSet(n);

// An element generating the faithful Z-subrepresentation.
var CYCLIC_GENERATOR = (function () {
	var ans = V.zero(n);
	ans[0] = 1;
	for (var i = 0; i < FACTORS.length; i++) {
		var tmp_v = new Array(n);
		var d = n/FACTORS[i];
		for (var j = 0; j < n; j++) {
			tmp_v[j] = -ans[(j + d) % n];
		}
		ans = V.add(ans, tmp_v);
	}
	return ans;
})();

// List of p < n/2 which are coprime to n.
var PRIMITIVES = (function () {
	var ans = [];
	for (var p = 1; p <= HALF_N; p++) {
		if (FACTORS.some(function (x) { return p % x == 0; })) { continue; }
		else { ans.push(p); }
	}
	return ans;
})();

// Basis for the representation.
// C^n has an eigenvector for each nth root of unity.
// We pair conjugate eigenvalues to get R-representations,
// and discard the non-faithful Z-representations.
var CYCLIC_BASIS = (function () {
	// Make the basis elements
	var ans = [];
	var norm = Math.sqrt(4/(n * V.dot(CYCLIC_GENERATOR, CYCLIC_GENERATOR)));
	for (var p = 0; p < PRIMITIVES.length; p++) {
		for (var i = 0; i < 2; i++) {
			var next = new Array(n);
			for (var j = 0; j < n; j++) {
				next[j] = CIS[i][(PRIMITIVES[p] * j) % n] * norm;
			}
			ans.push(next);
		}
	}
	return ans;
})();

// Eigenvalues of a map that expands the visible eigenspace
// while shrinking the others, preserving unsigned total volume
// and taking lattice points to lattice points.
// These correspond to (totally) real units in Z[z],
// where z is a primitive nth root of unity.
//
// The basic strategy to find these is to take a coprime to n
// and use (z^a - 1)/(z - 1), noting that the numerator and
// denominator are Galois conjugates---so its field norm
// (the product over all conjugates of z) must be 1.
var SCALE_FACTORS = (function () {
	// If n is odd, take a = 2 to get z + 1.
	// Multiply by its complex conjugate to get a real unit.
	//
	// If n is even and n/2 has at least two distinct prime factors,
	// let p be one which is odd, k its multiplicity, and m = n/p^k.
	// Then calculate the norm in Q(z) of (z+1) by grouping terms:
	// Group z + 1 with wz + 1 for primitive mth roots of unity w.
	// The product of these is z^m + 1, with norm 1 in Q(z^m)
	// since p^k is odd---so we can still use a = 2.
	if (FACTORS[0] != 2 || FACTORS.length > 2 ||
			(FACTORS.length > 1 && n % 4 == 0)) {
		return PRIMITIVES.map(function (p) {
			return 2 + 2 * CIS[0][p];
		});
	} else {
		// What's left over is when n is a power of 2 or is
		// 2 times a power of an odd prime p. If p = 3,
		// we use a = 5; otherwise we can use a = 3.
		if (FACTORS[1] == 3) {
			return PRIMITIVES.map(function (p) {
				return 1 + 2 * CIS[0][p] + 2 * CIS[0][(p + p) % n];
			});
		} else {
			return PRIMITIVES.map(function (p) {
				return 1 + 2 * CIS[0][p];
			});
		}
	}
})();
SCALE_FACTORS = (function (x) {
	var ans = [];
	for (var i = 0; i < x.length; i++) {
		ans.push(x[i]);
		ans.push(x[i]);
	}
	return ans;
})(SCALE_FACTORS);

var Cyclic = {
	EPSILON: 1e-9,
	BASIS: CYCLIC_BASIS,
	BASIS_NORM_SQUARED: 2/V.dot(CYCLIC_GENERATOR, CYCLIC_GENERATOR),
	DIMENSION: n,
	DIMENSION_VISIBLE: 2,
	DIMENSION_HIDDEN: Math.max(0, CYCLIC_BASIS.length - 2),
	CYCLIC_ELEMENT: CYCLIC_GENERATOR,
	"SCALE_FACTORS": SCALE_FACTORS,

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

	// Self-tests
	testBasisOrthogonality: function () {
		// Self-test for orthogonality
		var norm = this.BASIS_NORM_SQUARED || 1;
		var id = function (i, j) {
			if (i == j) { return norm; } else { return 0; }
		};
		for (var i = 0; i < n-1; i++) {
			for (var j = 0; j < n-1; j++) {
				if (Math.abs(V.dot(this.BASIS[i], this.BASIS[j]) - id(i,j)) > this.EPSILON) {
					return [i, j];
				}
			}
		}
		return false;
	},

};

return Cyclic;

};
