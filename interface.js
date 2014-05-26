var ActiveForm = (function () {

var fieldName = function (field) {
	return $(field).attr('name') || $(field).attr('id');
};

var ActiveForm = function (f) {
	this.formElement = $(f);
	this.validators = [];
	this.field_processors = {};
	this.actions = [];
	this.processField = this.processField.bind(this);
	this.bindHandlers();
};
ActiveForm.defaultProcessor = function (x) { return [false, $(x).val()]; };
ActiveForm.numericProcessor = function (f) {
	var ans = Math.round(parseFloat($(f).val()));
	if (isNaN(ans)) {
		return [true, 'Not a number: ' + $(f).val()];
	} else {
		return [false, ans];
	}
};

ActiveForm.prototype = {
	processField: function (f) {
		var processor = this.field_processors[fieldName(f)];
		if (!processor) {
			if ($(f).is('.numeric')) { processor = ActiveForm.numericProcessor; }
			else { processor = ActiveForm.defaultProcessor; }
		}
		return processor($(f).get(0));
	},
	processData: function () {
		var ans = { errors: "", };
		// Per-field validation and processing
		var fields = this.formElement.find('input');
		for (var i = 0; i < fields.length; i++) {
			var value = this.processField(fields[i]);
			if (value[0]) {
				if (!ans.errors) { ans.errors = []; }
				ans.errors.push(value[1]);
			} else {
				ans[fieldName(fields[i])] = value[1];
			}
		}
		// Form-wide validation and processing
		for (var i = 0; i < this.validators.length; i++) {
			this.validators[i](ans);
		}
		return ans;
	},
	validate: function () {
		var data = this.processData();
		if (data.errors) {
			this.formElement.find('[type="submit"]').addClass('disabled');
		} else {
			this.formElement.find('[type="submit"]').removeClass('disabled');
		}
		return data;
	},
	bindHandlers: function () {
		var af = this;
		this.formElement.on('change', function (e) {
			if (af.processData().errors) {
				af.formElement.find('[type="submit"]').addClass('disabled');
			} else {
				af.formElement.find('[type="submit"]').removeClass('disabled');
			}
		});
		this.formElement.on('input', function (e) {
			var f = e.target;
			if (af.processField(f)[0]) {
				$(f).addClass('invalid').removeClass('valid');
			} else {
				$(f).addClass('valid').removeClass('invalid');
			}
		});
		this.formElement.on('submit', function (e) {
			var data = af.processData();
			if (data.errors) {
				e.preventDefault();
			} else {
				for (var i = 0; i < af.actions.length; i++) {
					af.actions[i](e, data);
				}
			}
		});
	},
};

return ActiveForm;
})();

var activateRootButtons = function () {
	$('.button_root').on('click', function (e) {
		e.stopPropagation();
		if (window.location.hash == $(this).attr('href')) {
			e.preventDefault();
			window.location = '#';
		}
	});
}
$(document).ready(activateRootButtons);

