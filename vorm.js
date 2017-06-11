;(function(undefined) {
'use strict';

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

// Polyfill from MDN with some modification following my taste
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (Object.assign === undefined) {
	Object.assign = function(a, b) { // .length of function is 2
		if (is_object(a) === false) { // TypeError if undefined or null (or non-object)
			throw new TypeError('Cannot convert different type to object');
		}
		var to = Object(a);
		for (var index = 1; index < arguments.length; index++) {
			var nextSource = arguments[index];
			if (nextSource === undefined || nextSource === null) continue; // Skip over if undefined or null
			for (var nextKey in nextSource) {
				// Avoid bugs when hasOwnProperty is shadowed
				if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
					to[nextKey] = nextSource[nextKey];
				}
			}
		}
		return a;
	};
}


// default
var form_validation_config = {
	alert: {
		template: '<div class="tooltip vorm"><div class="tooltip-arrow vorm-arrow"></div><div class="tooltip-inner vorm-inner"></div></div>',
		placement: 'bottom',
		trigger: 'manual' // actually you cannot change this (template too).
	}
}

var form_validation = function(form_selector, all_rules) {
	// validate form
	// return; in purpose to make your life harder
	if (is_string(form_selector)) {
		this.form = document.getElementById(form_selector);
		if (this.form === null) return;
	} else if(form_selector.tagName !== undefined && /^(FORM|FIELDSET)$/.test(form_selector.tagName)) {
		this.form = form_selector;
	} else return;

	// indicator
	// prevent shitload event listener
	// basically happen when spamming submit form (or enter)
	this.is_idle_error = false;

	this.rules = all_rules;

	this.attach_submit_event();
};

form_validation.prototype.attach_submit_event = function() {
	var this_instance = this;
	var attach_submit_opt = true;
	var attach_submit_fn = function(ev) {
		ev.preventDefault();

		this_instance.form.removeEventListener('submit', attach_submit_fn, attach_submit_opt);

		if (this_instance.is_idle_error) {
			this_instance.attach_submit_event();
		} else {
			this_instance.run.apply(this_instance);
		}
	}
	this.form.addEventListener('submit', attach_submit_fn, attach_submit_opt);
};

form_validation.prototype.run = function() {
	var do_submit = true;
	for(var input_name in this.rules) {
		if (this.execute_rules(input_name) === false) {
			do_submit = false;
			break;
		}
	}

	if (do_submit) {
		// (re)submit manual (because we stop it for validation)
		this.form.submit();
	}

	// (re)listen on form submit
	this.attach_submit_event();

	if (do_submit) return true;
	else return false;
};

form_validation.prototype.execute_rules = function(input_name) {
	var is_no_err = true;
	var err_msg = null;
	for (var i = 0; i < this.rules[input_name].length; i++) {
		var input = this.form.elements.namedItem(input_name);
		if (input == null) continue;

		if (is_string(this.rules[input_name][i])) {
			is_no_err = form_validation_rules[this.rules[input_name][i]].action.apply(this, [input]);
			err_msg = form_validation_rules[this.rules[input_name][i]].message;

		} else if (is_array(this.rules[input_name][i])) {
			var rule_name = this.rules[input_name][i][0];
			var params = this.rules[input_name][i].slice(1); // copy
			params.unshift(input);

			is_no_err = form_validation_rules[rule_name].action.apply(this, params);
			err_msg = form_validation_rules[rule_name].message;

		} else if (is_object(this.rules[input_name][i])) {
			var params = (this.rules[input_name][i].params || []).slice(); // copy
			params.unshift(input);
			is_no_err = this.rules[input_name][i].action.apply(this, params);
			err_msg = this.rules[input_name][i].message;

		} else {
			is_no_err = true;
		}

		if (is_no_err === false) {

			// alert(err_msg); // default

			this.is_idle_error = true;

			var err = new Tooltip(input, Object.assign({title: err_msg}, form_validation_config.alert));

			var this_instance = this;
			var elm_cb_opts = true;
			var elm_cb_fn_input = function() {
				err._dispose();
				input.removeEventListener('input', elm_cb_fn_input, elm_cb_opts);
				input.removeEventListener('blur', elm_cb_fn_blur, elm_cb_opts);
				this_instance.is_idle_error = false;
			}
			var elm_cb_fn_blur = function() {
				err._dispose();
				input.removeEventListener('input', elm_cb_fn_input, elm_cb_opts);
				input.removeEventListener('blur', elm_cb_fn_blur, elm_cb_opts);
				this_instance.is_idle_error = false;
			}

			input.addEventListener('input', elm_cb_fn_input, elm_cb_opts);
			input.addEventListener('blur', elm_cb_fn_blur, elm_cb_opts);

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
	min_length: {
		params: [0],
		action: function(elm, min) {
			if (elm.value.length < min) {
				return false;
			}
			return true;
		},
		message: 'min_length[0]'
	},
	max_length: {
		params: [Infinity],
		action: function(elm, max) {
			if (elm.value.length > max) {
				return false;
			}
			return true;
		},
		message: 'max_length[Infinity]'
	},
	between_length: {
		params: [0, Infinity],
		action: function(elm, min, max) {
			var a = form_validation_rules.min_length.action(elm, min);
			var b = form_validation_rules.max_length.action(elm, max);
			if (a && b) {
				return true;
			}
			return false;
		},
		message: 'between_length[0,Infinity]'
	}
};

window.Vorm = function(form, rules) {
	return (new form_validation(form, rules));
};

window.Vorm.default = form_validation_config;
window.Vorm.default_rules = form_validation_rules;

})();
