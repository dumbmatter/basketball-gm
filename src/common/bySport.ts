const bySport = <T extends unknown>(
	object:
		| {
				basketball: T;
				football: T;
				hockey: T;
				default?: T;
		  }
		| {
				basketball?: T;
				football?: T;
				hockey?: T;
				default: T;
		  },
): T => {
	const sport = process.env.SPORT;
	if (object.hasOwnProperty(sport)) {
		// https://github.com/microsoft/TypeScript/issues/21732
		// @ts-ignore
		return object[sport];
	}

	if (object.hasOwnProperty("default")) {
		// https://github.com/microsoft/TypeScript/issues/21732
		// @ts-ignore
		return object.default;
	}

	throw new Error("No value for sport and no default");
};

export default bySport;
