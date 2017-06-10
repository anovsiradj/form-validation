;(function(undefined) {

function is_array(o) {
	if (Array.isArray === undefined) return Object.prototype.toString.call(o) === '[object Array]';
	return Array.isArray(o);
}
function is_string(o) {
	return Object.prototype.toString.call(o) === '[object String]';
}
function is_object(o) {
	return Object.prototype.toString.call(o) === "[object Object]";
}

// default
var form_validation_config = {
	alert: {
		template: '<div class="tooltip vorm"><div class="tooltip-arrow vorm-arrow"></div><div class="tooltip-inner vorm-inner"></div></div>',
		placement: 'bottom',
		trigger: 'manual'
	}
}

var form_validation = function(form_selector, rules, submit_callback, submit_prevent_default) {
	if (submit_prevent_default === undefined) this.prevent_default = false;
	else this.prevent_default = submit_prevent_default;

	// validate form
	if (is_string(form_selector)) {
		this.form = document.getElementById(form_selector);
		if (this.form === null) return;
	} else if(/^(FORM|FIELDSET)$/.test((form_selector || {}).tagName)) {
		this.form = form_selector;
	} else return; // in purpose to make your life harder

	this.all_rules = rules;
	this.callback = submit_callback || function() {};

	this.attach_submit_event();
};

form_validation.prototype.attach_submit_event = function() {
	var this_instance = this;
	var attach_submit_fn = function(ev) {
		ev.preventDefault();
		setTimeout(function() {
			this_instance.form.removeEventListener('submit', attach_submit_fn);
			this_instance.run.apply(this_instance);
		}, 0);
	}
	this.form.addEventListener('submit', attach_submit_fn, true);
};

form_validation.prototype.run = function() {
	var do_submit = true;
	for(var input_name in this.all_rules) {
		if (this.execute_rules(input_name) === false) {
			do_submit = false;
			break;
		}
	}

	if (do_submit) {
		var this_instance = this;
		var do_submit_fn = function(ev) {
			// alert(1);
			// ev.preventDefault();
			// alert(0);
			// console.log(this_instance.prevent_default);
			if (this_instance.prevent_default) ev.preventDefault();

			this_instance.callback.apply(this_instance);

			setTimeout(function() {
				this_instance.form.removeEventListener('submit', do_submit_fn);
				this_instance.attach_submit_event.apply(this_instance);
			}, 0);
		};
		this.form.addEventListener('submit', do_submit_fn);
		setTimeout(function() {
			this_instance.form.submit();
		}, 0);

	} else this.attach_submit_event();

	if (do_submit) return true;
	else return false;
};

form_validation.prototype.execute_rules = function(input_name, input_rules) {
	input_rules = (input_rules || this.all_rules[input_name]) || [];

	var is_no_err = true;
	var err_msg = null;
	for (var i = 0; i < input_rules.length; i++) {
		var input = this.form.elements.namedItem(input_name);
		if (input == null) continue;

		if (is_string(input_rules[i])) {
			is_no_err = form_validation_rules[input_rules[i]].action.apply(this, [input]);
			err_msg = form_validation_rules[input_rules[i]].message;

		} else if (is_array(input_rules[i])) {
			var rule_name = input_rules[i][0];
			var params = input_rules[i].slice(1);
			params.unshift(input);

			is_no_err = form_validation_rules[rule_name].action.apply(this, params);
			err_msg = form_validation_rules[rule_name].message;

		} else if (is_object(input_rules[i])) {
			var params = input_rules[i].params || [];
			params.unshift(input);
			is_no_err = input_rules[i].action.apply(this, params);
			err_msg = input_rules[i].message;

		} else {
			is_no_err = true;
		}

		if (is_no_err === false) {

			// alert(err_msg); // default

			var err = new Tooltip(input, Object.assign({title: err_msg}, form_validation_config.alert));

			var elm_cb_opts = {once: true};
			var elm_cb_input_fn = function() {
				err._dispose();
				input.removeEventListener('blur', elm_cb_blur_fn, elm_cb_opts);
			}
			var elm_cb_blur_fn = function() {
				err._dispose();
				input.removeEventListener('input', elm_cb_input_fn, elm_cb_opts);
			}

			input.addEventListener('input', elm_cb_input_fn, elm_cb_opts);
			input.addEventListener('blur', elm_cb_blur_fn, elm_cb_opts);

			err.show();
			input.focus();

			break;
		}
	}
	return is_no_err;
};

var form_validation_rules = {
	important: {
		action: function(elm) {
			if (elm.value === '') {
				return false;
			}
			return true;
		},
		message: 'This field is required.'
	},
	max_length: {
		action: function(elm, max) {
			if (elm.value.length > max) {
				return false;
			}
			return true;
		},
		message: 'bbbb'
	},
	min_length: {
		action: function(elm, min) {
			if (elm.value.length < min) {
				return false;
			}
			return true;
		},
		message: 'aaaa'
	}
};

window.Vorm = function(form, rules) {
	return (new form_validation(form, rules));
};

window.Vorm.default = form_validation_config;

})();
