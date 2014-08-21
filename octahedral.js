// The octahedral group acting on Z^3.

var Octahedral = (function () {

var Octahedral = {
	EPSILON: 1e-9,
	BASIS: [[1,0,0],[0,1,0],[0,0,1]],
	DIMENSION: 3,
	DIMENSION_VISIBLE: 3,
	DIMENSION_HIDDEN: 0,
	GROUP_IS_MATRIX_LIST: true,
	CYCLIC_ELEMENT: [1,0,0],
	isFundamental: function (coords) {
		return coords[0] >= -this.EPSILON &&
			coords[1] >= coords[0] - this.EPSILON &&
			coords[2] >= coords[1] - this.EPSILON;
	},
	act: function (i, v) { return M.mul(this.GROUP[i], v); },
	GROUP: (function () {
		var ans = new Array(48);
		function product() {
			var p = ans[arguments[0] || 0];
			for (var i = 1; i < arguments.length; i++) {
				p = M.mulMats(p, ans[arguments[i] || 0]);
			}
			return p;
		}
		// The first eight entries realize the dihedral group of the square
		ans[0] = [[1,0,0],[0,1,0],[0,0,1]]; // identity
		ans[1] = [[0,-1,0],[1,0,0],[0,0,1]]; // rotate xy
		ans[2] = product(1,1);
		ans[3] = product(1,1,1);
		ans[4] = [[-1,0,0],[0,1,0],[0,0,1]]; // reflect x
		ans[5] = product(4,1);
		ans[6] = product(4,2);
		ans[7] = product(4,3);
		// Move to each face...
		ans[8] = [[1,0,0],[0,1,0],[0,0,-1]]; // z to -z
		ans[9] = [[1,0,0],[0,0,1],[0,-1,0]]; // to y
		ans[10] = [[1,0,0],[0,0,-1],[0,1,0]]; // to -y
		ans[11] = [[0,0,1],[0,1,0],[-1,0,0]]; // to x
		ans[12] = [[0,0,-1],[0,1,0],[1,0,0]]; // to -x
		var k = 13;
		for (var i = 1; i < 8; i++) {
			for (var j = 8; j < 13; j++) {
				ans[k] = product(j, i);
				k++;
			}
		}
		return ans;
	})(),
};

return Octahedral;
})();
