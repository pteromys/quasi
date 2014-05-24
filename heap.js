var Heap = (function () {

var Heap = function (items, lessThan) {
	// A 1-indexed min-heap.
	if (!(this instanceof Heap)) { return new Heap(items, lessThan); }
	this.lessThanRaw = lessThan || function (a, b) { return (a < b); };
	this.items = [0].concat(items || []);
	this.heights = [-1];
	this.heapify();
};

Heap.prototype = {
	// Public API
	lessThan: function (a, b) {
		if (typeof(a) == 'undefined') { return false; }
		if (typeof(b) == 'undefined') { return true; }
		return this.lessThanRaw(a, b);
	},
	first: function () {
		// Don't make the user care whether we're 0-indexed or 1-indexed.
		return this.items[1];
	},
	pop: function (replacement) {
		var ans = this.displace(1, replacement);
		var i = this.shiftDown(1);
		if (typeof(this.items[i]) == 'undefined') {
			this.heights[i] = undefined;
			this.propagateHeights(i >> 1);
		}
		return ans;
	},
	push: function (item) {
		// Push an item into the root
		var i = 1;
		while (typeof(item) != 'undefined') {
			if (this.lessThan(item, this.items[i])) {
				item = this.displace(i, item);
			}
			i <<= 1;
			if ((this.heights[i+1] || 0) < (this.heights[i] || 0)) { i++; }
		}
		this.propagateHeights(i >> 1);
	},
	heapify: function () {
		for (var i = this.items.length >> 1; i > 0; i--) {
			this.shiftDown(i);
		}
		for (var i = this.items.length - 1; i > 0; i--) {
			this.propagateHeights(i);
		}
	},
	check: function () {
		// Check the heap invariant
		for (var i = 2; i < this.items.length; i++) {
			if (this.lessThan(this.items[i], this.items[i >> 1])) { return i; }
		}
		// Check the heights
		for (var i = 1; i < this.items.length; i++) {
			if (this.idealHeight(i) != (this.heights[i] || 0)) { return i; }
		}
	},

	// Internal API
	displace: function (i, replacement) {
		// Single-item splice.
		var replaced = this.items[i];
		this.items[i] = replacement;
		return replaced;
	},
	shiftDown: function (i) {
		// Push items[i] down the tree until the invariant is restored.
		// Return the index of the last item replaced.
		var j = i << 1;
		while (true) {
			if (this.lessThan(this.items[j+1], this.items[j])) { j++; }
			if (!this.lessThan(this.items[j], this.items[i])) {
				break;
			}
			this.items[j] = this.displace(i, this.items[j]);
			i = j;
			j <<= 1;
		}
		return i;
	},
	idealHeight: function (i) {
		var j = i << 1;
		var ans = 1 + Math.max(this.heights[j] || 0, this.heights[j^1] || 0);
		if (ans == 1 && typeof(this.items[i]) == 'undefined') {
			ans = 0;
		}
		return ans;
	},
	propagateHeights: function (i) {
		while (i > 0) {
			var new_height = this.idealHeight(i);
			if (new_height == this.heights[i]) { break; }
			this.heights[i] = new_height;
			i >>= 1;
		}
	},
};

return Heap;
})();
