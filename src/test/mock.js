
exports.data = function (req) {
	return {

		'data|1-10': [
			{
				'name': module.Mock.Random.integer(10, 100)
			}
		]

	};
};
