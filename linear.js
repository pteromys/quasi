// Vector and matrix operations on Array-like objects.

// Vectors
var V = {
	dot: function (x, y) {
		var ans = 0;
		for (var i = Math.min(x.length, y.length) - 1; i >= 0; i--) {
			ans += x[i] * y[i];
		}
		return ans;
	},
	scale: function (v, a) {
		return v.map(function (x) { return x * a; });
	},
	add: function (x, y) {
		var ans = new Array(Math.min(x.length, y.length));
		for (var i = 0; i < ans.length; i++) {
			ans[i] = x[i] + y[i];
		}
		return ans;
	},
	zero: function (n) {
		var ans = new Array(n);
		for (var i = 0; i < n; i++) { ans[i] = 0; }
		return ans;
	},
	isZero: function (v) {
		for (var i = 0; i < v.length; i++) {
			if (v[i] != 0) {
				return false;
			}
		}
		return true;
	},
	rotate: function (v) {
		if (!v.length) { return; }
		var sw = v[0];
		for (var i = 0; i < v.length - 1; i++) {
			v[i] = v[i+1];
		}
		v[v.length - 1] = sw;
	},
};

// Matrices
var M = {
	mul: function (m, v) {
		var ans = V.zero(m.length);
		for (var i = 0; i < ans.length; i++) {
			for (var j = 0; j < v.length; j++) {
				ans[i] += m[i][j] * v[j];
			}
		}
		return ans;
	},
	transpose: function (m) {
		if (!(m && m.length && m[0] && m[0].length)) { return []; }
		var ans = new Array(m[0].length);
		for (var i = 0; i < m[0].length; i++) {
			ans[i] = V.zero(m.length);
			for (var j = 0; j < m.length; j++) {
				ans[i][j] = m[j][i];
			}
		}
		return ans;
	},
	mulMats: function (m, n) {
		if (!(m && m.length && m[0] && m[0].length)) { return []; }
		if (!(n && n.length && n[0] && n[0].length)) { return []; }
		if (m[0].length != n.length) { return []; }
		var ans = new Array(m.length);
		for (var i = 0; i < m.length; i++) {
			ans[i] = V.zero(n[0].length);
			for (var j = 0; j < ans.length; j++) {
				for (var k = 0; k < m[i].length; k++) {
					ans[i][j] += m[i][k] * n[k][j];
				}
			}
		}
		return ans;
	},
};
