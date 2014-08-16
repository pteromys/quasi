// Various data on the icosahedral group H_3 = Alt_5 x Z/2
// and its irreducible representation on Z^6 < R^6 = R^3 (+) R^3.

var Icos = (function () {

// Basis for the representation.
// * In each R^3 summand the basis axes project to long diagonals of an
//   icosahedron, and H_3 acts by permutations and flips.
// * Each basis vector has length sqrt(2) in the Euclidean metric.
// * Written as a matrix of column vectors to facilitate taking linear
//   combinations via matrix multiplication.
var ICOS_BASIS = (function () {
	var c = 1/Math.sqrt(5);
	var s = 2/Math.sqrt(5);
	var c2 = (Math.sqrt(5) - 1)/4;
	var s2 = Math.sqrt(10 + 2*Math.sqrt(5))/4;
	var c4 = (-Math.sqrt(5) - 1)/4;
	var s4 = Math.sqrt(10 - 2*Math.sqrt(5))/4;
	return [
		[0,  s,  s*c2,  s*c4,  s*c4,  s*c2],
		[0,  0,  s*s2,  s*s4, -s*s4, -s*s2],
		[1,  c,  c,     c,     c,     c],
		[0, -s, -s*c4, -s*c2, -s*c2, -s*c4],
		[0,  0, -s*s4,  s*s2, -s*s2,  s*s4],
		[1, -c, -c,    -c,    -c,    -c],
	];
})();

var Icos = {
	EPSILON: 1e-9,
	BASIS: ICOS_BASIS,
	testBasisOrthogonality: function () {
		// Self-test for orthogonality
		var m = M.mulMats(M.transpose(this.BASIS), this.BASIS);
		var id = function (i, j) { if (i == j) { return 2; } else { return 0; } };
		for (var i = 0; i < 6; i++) {
			for (var j = 0; j < 6; j++) {
				if (Math.abs(m[i][j] - id(i,j)) > 1e-9) { return [i, j]; }
			}
		}
		return false;
	},

	// Test whether a point is in the fundamental domain
	// attached to point 0, on edge 01, and in triangle 012.
	isFundamental: function (coords) {
		var dots = M.mul(this.BASIS, coords.slice(0,3));
		return dots[2] >= dots[5] - this.EPSILON &&
			dots[1] >= dots[2] - this.EPSILON &&
			dots[0] >= dots[1] - this.EPSILON;
	},

	// Two matrices acting on Z^6 which act by scaling with
	// reciprocal factors on the R^3 summands.
	M_EXPAND: [
		[2, 1, 1, 1, 1, 1],
		[1, 2, 1, -1, -1, 1],
		[1, 1, 2, 1, -1, -1],
		[1, -1, 1, 2, 1, -1],
		[1, -1, -1, 1, 2, 1],
		[1, 1, -1, -1, 1, 2],
	],
	M_SHRINK: [
		[-2, 1, 1, 1, 1, 1],
		[1, -2, 1, -1, -1, 1],
		[1, 1, -2, 1, -1, -1],
		[1, -1, 1, -2, 1, -1],
		[1, -1, -1, 1, -2, 1],
		[1, 1, -1, -1, 1, -2],
	],
	actExpand: function (v) { return M.mul(this.M_EXPAND, v); },
	actShrink: function (v) { return M.mul(this.M_SHRINK, v); },

	// The group action
	act: function (i, v) { return M.mul(this.GROUP[i], v); },
	GROUP: (function () {
		var ans = new Array(120);
		function product() {
			var p = ans[arguments[0] || 0];
			for (var i = 1; i < arguments.length; i++) {
				p = M.mulMats(p, ans[arguments[i] || 0]);
			}
			return p;
		}
		ans[0] = [ // identity
			[1, 0, 0, 0, 0, 0],
			[0, 1, 0, 0, 0, 0],
			[0, 0, 1, 0, 0, 0],
			[0, 0, 0, 1, 0, 0],
			[0, 0, 0, 0, 1, 0],
			[0, 0, 0, 0, 0, 1],
		];
		ans[1] = [ // a rotation in S_3 on triangle 012
			[0, 0, 1, 0, 0, 0],
			[1, 0, 0, 0, 0, 0],
			[0, 1, 0, 0, 0, 0],
			[0, 0, 0, 0, -1, 0],
			[0, 0, 0, 0, 0, -1],
			[0, 0, 0, 1, 0, 0],
		];
		ans[2] = [ // a reflection in S_3 on triangle 012
			[1, 0, 0, 0, 0, 0],
			[0, 0, 1, 0, 0, 0],
			[0, 1, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 1],
			[0, 0, 0, 0, 1, 0],
			[0, 0, 0, 1, 0, 0],
		];
		// fill out the rest of S_3
		ans[3] = product(1, 1);
		ans[4] = product(1, 2);
		ans[5] = product(2, 1);
		// take triangle 012 to other triangles
		ans[6] = [
			[0, 0, 0, 0, -1, 0],
			[0, 1, 0, 0, 0, 0],
			[0, 0, 1, 0, 0, 0],
			[0, 0, 0, 0, 0, -1],
			[-1, 0, 0, 0, 0, 0],
			[0, 0, 0, -1, 0, 0],
		];
		ans[7] = product(1, 6);
		ans[8] = product(3, 6);
		ans[9] = product(6, 7);
		for (var i = 1; i < 6; i++) {
			ans[9+i] = product(i, 9);
		};
		// fill each of the other triangles
		var k = 15;
		for (var i = 1; i < 6; i++) {
			for (var j = 6; j < 15; j++) {
				ans[k] = product(j, i);
				k++;
			}
		}
		// reflect everything through the origin
		ans[60] = [ // antipodal
			[-1, 0, 0, 0, 0, 0],
			[0, -1, 0, 0, 0, 0],
			[0, 0, -1, 0, 0, 0],
			[0, 0, 0, -1, 0, 0],
			[0, 0, 0, 0, -1, 0],
			[0, 0, 0, 0, 0, -1],
		];
		for (var i = 1; i < 60; i++) {
			ans[60+i] = product(60, i);
		}
		return ans;
	})(),
	testGroup: function () {
		// Group self-test for no duplicates and correct matrix sizes
		for (var i = 0; i < 120; i++) {
			var a = this.GROUP[i];
			// Test for matrix sizes
			if (!a || (a.length != 6)) { return i; }
			for (var y = 0; y < 6; y++) {
				if (!a[y] || (a[y].length != 6)) { return i; }
			}
			// Test for duplicates
			for (var j = 0; j < i; j++) {
				var b = this.GROUP[j];
				var different = false;
				for (var y = 0; y < 6; y++) {
					for (var x = 0; x < 6; x++) {
						if (a[y][x] != b[y][x]) { different = true; }
					}
				}
				if (!different) { return [i, j]; }
			}
		}
		return false;
	},
};

return Icos;

})();
