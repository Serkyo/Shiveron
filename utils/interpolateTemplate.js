module.exports = function(template, args) {
	return Object.entries(args).reduce((result, [arg, val]) => result.replace(`$\{${arg}}`, `${val}`), template);
};