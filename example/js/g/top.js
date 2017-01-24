const obj = {
	Func5() {
		return '555555';
	},
	Func6() {
		return 6666666;
	},

	Func7() {
		return 777777;
	},

	Func8() {
		return 8888888;
	}
};

export function Func1() {
	return 'top_module';
}

export function Func2() {
	setTimeout(() => Func3(), 1000);
	return 222222;
}

export function Func3() {
	return obj.Func5();
}

export function Func4() {
	return 444444;
}

