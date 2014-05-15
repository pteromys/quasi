var Heap = function (items, comparator) {
	if (!(this instanceof Heap)) { return new Heap(items, comparator); }
	// A zero-indexed min-heap.
	this.cmp = comparator;
	this.items = [];
	for (var i = 0; i < items.length; i++) {
		this.push(items[i]);
	}
};

Heap.prototype = {
	push: function (item) {
		// Push an item onto the root of the heap
		var k = 0;
		var swap = null;
		while (true) {
			if (typeof(this.items[k]) == 'undefined') {
				this.items[k] = item;
				break;
			}
			if (this.cmp(item, this.items[k])) {
				swap = this.items[k];
				this.items[k] = item;
				item = swap;
			}
			k = 2*k + 1;
			if (this.cmp(this.items[k], this.items[k+1]) ||
					(typeof(this.items[k+1]) == 'undefined')) {
				k++;
			}
		}
	},
	pop: function (replacement) {
		var k = 0;
		var j = 0;
		var swap = null;
		var item = this.items[0];
		this.items[0] = replacement;
		while (true) {
			j = 2 * k + 1;
			if (this.cmp(this.items[j+1], this.items[j]) ||
					(typeof(this.items[j]) == 'undefined')) {
				j++;
			}
			if (this.cmp(this.items[k], this.items[j]) ||
					(typeof(this.items[j]) == 'undefined')) {
				break;
			}
			swap = this.items[k];
			this.items[k] = this.items[j];
			this.items[j] = swap;
			k = j;
		}
		//if (typeof(this.items[k]) == 'undefined') { delete this.items[k]; }
		return item;
	},
	check: function () {
		for (var i = 0; i < this.items.length; i++) {
			for (var k = 2*i + 1; k <= 2*i + 2; k++) {
				if (this.cmp(this.items[k], this.items[i])) { return k; }
				if (typeof(this.items[k]) != 'undefined' && typeof(this.items[i]) == 'undefined') { return k; }
			}
		}
	},
};
