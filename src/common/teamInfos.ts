import bySport from "./bySport";

const teamInfos: {
	[key: string]: {
		region: string;
		name: string;
		pop: number;
		colors: [string, string, string];
		jersey: string;
	};
} = {
	ATL: {
		region: "Atlanta",
		name: "Gold Club",
		pop: 5.3,
		colors: ["#5c4a99", "#f0e81c", "#211e1e"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football2",
			hockey: "hockey3",
		}),
	},
	BAL: {
		region: "Baltimore",
		name: "Crabs",
		pop: 2.7,
		colors: ["#89bfd3", "#7a1319", "#07364f"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football3",
			hockey: "hockey",
		}),
	},
	BOS: {
		region: "Boston",
		name: "Massacre",
		pop: 7.3,
		colors: ["#0d435e", "#f0494a", "#cccccc"],
		jersey: bySport({
			basketball: "jersey5",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	BKN: {
		region: "Brooklyn",
		name: "Bagels",
		pop: 21.5,
		colors: ["#034757", "#67c7e9", "#b78254"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	CHA: {
		region: "Charlotte",
		name: "Queens",
		pop: 1.5,
		colors: ["#009e87", "#541f3e", "#ffffff"],
		jersey: bySport({
			basketball: "jersey3",
			football: "football2",
			hockey: "hockey4",
		}),
	},
	CHI: {
		region: "Chicago",
		name: "Whirlwinds",
		pop: 9.1,
		colors: ["#ef670a", "#caeaf9", "#d3d3d3"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football2",
			hockey: "hockey3",
		}),
	},
	CIN: {
		region: "Cincinnati",
		name: "Riots",
		pop: 1.6,
		colors: ["#000000", "#c11616", "#2966ef"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football",
			hockey: "hockey4",
		}),
	},
	CLE: {
		region: "Cleveland",
		name: "Curses",
		pop: 1.7,
		colors: ["#211e1e", "#f8e3cc", "#3f1c59"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football2",
			hockey: "hockey4",
		}),
	},
	DAL: {
		region: "Dallas",
		name: "Snipers",
		pop: 6.6,
		colors: ["#be2026", "#2b2e81", "#ffffff"],
		jersey: bySport({
			basketball: "jersey3",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	DEN: {
		region: "Denver",
		name: "High",
		pop: 2.7,
		colors: ["#2b8643", "#163a1c", "#a1d297"],
		jersey: bySport({
			basketball: "jersey3",
			football: "football",
			hockey: "hockey",
		}),
	},
	DET: {
		region: "Detroit",
		name: "Muscle",
		pop: 4.0,
		colors: ["#3a61b6", "#9eb7e6", "#0a1130"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	HOU: {
		region: "Houston",
		name: "Apollos",
		pop: 6.2,
		colors: ["#4c91c2", "#c4c4c3", "#ffffff"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football2",
			hockey: "hockey3",
		}),
	},
	IND: {
		region: "Indianapolis",
		name: "Crossroads",
		pop: 1.6,
		colors: ["#e79f02", "#00246d", "#ffffff"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football2",
			hockey: "hockey3",
		}),
	},
	KC: {
		region: "Kansas City",
		name: "Sauce",
		pop: 1.6,
		colors: ["#8f2100", "#ffb500", "#d4731c"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football3",
			hockey: "hockey4",
		}),
	},
	LA: {
		region: "Los Angeles",
		name: "Lowriders",
		pop: 15.6,
		colors: ["#00008b", "#ffaf28", "#ff24ee"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football2",
			hockey: "hockey4",
		}),
	},
	LAE: {
		region: "Los Angeles",
		name: "Earthquakes",
		pop: 15.6,
		colors: ["#aeaeae", "#ea4b0f", "#dedddd"],
		jersey: bySport({
			basketball: "jersey3",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	LV: {
		region: "Las Vegas",
		name: "Blue Chips",
		pop: 2.1,
		colors: ["#1c73bb", "#ffd600", "#0c5983"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football",
			hockey: "hockey3",
		}),
	},
	MEM: {
		region: "Memphis",
		name: "Blues",
		pop: 1.3,
		colors: ["#000000", "#ff6c49", "#00aedc"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football3",
			hockey: "hockey4",
		}),
	},
	MIA: {
		region: "Miami",
		name: "Cyclones",
		pop: 6.1,
		colors: ["#4ac1c0", "#d8519d", "#f15949"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football4",
			hockey: "hockey4",
		}),
	},
	MIL: {
		region: "Milwaukee",
		name: "Cheesemakers",
		pop: 1.5,
		colors: ["#003600", "#fdc05f", "#007800"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football3",
			hockey: "hockey4",
		}),
	},
	MIN: {
		region: "Minneapolis",
		name: "Blizzard",
		pop: 2.8,
		colors: ["#8accdc", "#3d2971", "#ed9a22"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football2",
			hockey: "hockey",
		}),
	},
	MON: {
		region: "Montreal",
		name: "Mounties",
		pop: 3.5,
		colors: ["#ed1d3d", "#eac494", "#f2b316"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football4",
			hockey: "hockey4",
		}),
	},
	MXC: {
		region: "Mexico City",
		name: "Aztecs",
		pop: 20.5,
		colors: ["#1a9190", "#510f0f", "#eb5924"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football",
			hockey: "hockey3",
		}),
	},
	NOL: {
		region: "New Orleans",
		name: "Bayou",
		pop: 1.1,
		colors: ["#195869", "#4edd61", "#0e3e33"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football4",
			hockey: "hockey4",
		}),
	},
	NYC: {
		region: "New York",
		name: "Bankers",
		pop: 21.5,
		colors: ["#1e73ba", "#ff8500", "#ffffff"],
		jersey: bySport({
			basketball: "jersey5",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	OKC: {
		region: "Oklahoma City",
		name: "66ers",
		pop: 1.4,
		colors: ["#610000", "#bbb29e", "#e4dfcf"],
		jersey: bySport({
			basketball: "jersey3",
			football: "football3",
			hockey: "hockey",
		}),
	},
	ORL: {
		region: "Orlando",
		name: "Juice",
		pop: 2.2,
		colors: ["#dc5000", "#ffffff", "#0b7648"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football",
			hockey: "hockey4",
		}),
	},
	PHI: {
		region: "Philadelphia",
		name: "Cheesesteaks",
		pop: 5.5,
		colors: ["#46bae6", "#ffdb33", "#d9771f"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football",
			hockey: "hockey3",
		}),
	},
	PHO: {
		region: "Phoenix",
		name: "Vultures",
		pop: 4.3,
		colors: ["#d17d2a", "#231f20", "#c09867"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football2",
			hockey: "hockey4",
		}),
	},
	PIT: {
		region: "Pittsburgh",
		name: "Rivers",
		pop: 1.7,
		colors: ["#231f20", "#fbee28", "#fbee26"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football2",
			hockey: "hockey4",
		}),
	},
	POR: {
		region: "Portland",
		name: "Roses",
		pop: 2.0,
		colors: ["#e41d34", "#1e1e1e", "#e7a9cc"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	SA: {
		region: "San Antonio",
		name: "Churros",
		pop: 2.0,
		colors: ["#4a2b14", "#30d9ff", "#704723"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football2",
			hockey: "hockey4",
		}),
	},
	SAC: {
		region: "Sacramento",
		name: "Gold Rush",
		pop: 1.8,
		colors: ["#735823", "#e4c649", "#f8e19f"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football2",
			hockey: "hockey",
		}),
	},
	SD: {
		region: "San Diego",
		name: "Pandas",
		pop: 4.7,
		colors: ["#231f20", "#ffffff", "#b2b3b3"],
		jersey: bySport({
			basketball: "jersey5",
			football: "football2",
			hockey: "hockey4",
		}),
	},
	SEA: {
		region: "Seattle",
		name: "Symphony",
		pop: 3.8,
		colors: ["#47ff47", "#000000", "#8f8f8f"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football4",
			hockey: "hockey",
		}),
	},
	SF: {
		region: "San Francisco",
		name: "Venture Capitalists",
		pop: 6.5,
		colors: ["#0e442e", "#d75f27", "#e7d3ae"],
		jersey: bySport({
			basketball: "jersey3",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	STL: {
		region: "St. Louis",
		name: "Spirits",
		pop: 2.2,
		colors: ["#133cd1", "#c0c1c2", "#3a3a3a"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football",
			hockey: "hockey4",
		}),
	},
	TOR: {
		region: "Toronto",
		name: "Beavers",
		pop: 6.6,
		colors: ["#832525", "#a17266", "#5e372c"],
		jersey: bySport({
			basketball: "jersey2",
			football: "football3",
			hockey: "hockey3",
		}),
	},
	TPA: {
		region: "Tampa",
		name: "Turtles",
		pop: 2.7,
		colors: ["#023a02", "#17cc21", "#eb851e"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football2",
			hockey: "hockey",
		}),
	},
	UTA: {
		region: "Utah",
		name: "Missionaries",
		pop: 2.3,
		colors: ["#7c7c7c", "#000000", "#aea57a"],
		jersey: bySport({
			basketball: "jersey4",
			football: "football",
			hockey: "hockey3",
		}),
	},
	VAN: {
		region: "Vancouver",
		name: "Whalers",
		pop: 2.3,
		colors: ["#213063", "#1ea194", "#117568"],
		jersey: bySport({
			basketball: "jersey5",
			football: "football4",
			hockey: "hockey4",
		}),
	},
	WAS: {
		region: "Washington",
		name: "Monuments",
		pop: 6.2,
		colors: ["#213063", "#c5ae6e", "#ffffff"],
		jersey: bySport({
			basketball: "jersey3",
			football: "football3",
			hockey: "hockey3",
		}),
	},
};

teamInfos.LAL = teamInfos.LA;
teamInfos.LAC = teamInfos.LAE;
teamInfos.GS = {
	...teamInfos.SF,
	region: "Golden State",
};

export default teamInfos;
