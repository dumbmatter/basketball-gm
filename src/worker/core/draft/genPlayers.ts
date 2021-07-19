import { isSport, PLAYER } from "../../../common";
import { finances, player, realRosters } from "..";
import genPlayersWithoutSaving from "./genPlayersWithoutSaving";
import { idb } from "../../db";
import { g, helpers, logEvent } from "../../util";

/**
 * Generate a set of draft prospects.
 *
 * This is called after draft classes are moved up a year, to create the new draft class. It's also called 3 times when a new league starts, to create 3 future draft classes.
 *
 * @memberOf core.draft
 * @param {number} draftYear Year for the draft class.
 * @param {?number=} scoutingRank Between 1 and g.get("numActiveTeams"), the rank of scouting spending, probably over the past 3 years via core.finances.getRankLastThree. If null, then it's automatically found.
 * @param {?number=} numPlayers The number of prospects to generate. Default value is 70.
 * @return {Promise}
 */
const genPlayers = async (
	draftYear: number,
	scoutingRank: number | undefined | null = null,
	forceScrubs?: boolean,
) => {
	// If scoutingRank is not supplied, have to hit the DB to get it
	if (scoutingRank === undefined || scoutingRank === null) {
		const teamSeasons = await idb.cache.teamSeasons.indexGetAll(
			"teamSeasonsByTidSeason",
			[
				[g.get("userTid"), g.get("season") - 2],
				[g.get("userTid"), g.get("season")],
			],
		);
		scoutingRank = finances.getRankLastThree(
			teamSeasons,
			"expenses",
			"scouting",
		);
	}

	const allDraftProspects = await idb.cache.players.indexGetAll(
		"playersByTid",
		PLAYER.UNDRAFTED,
	);

	const existingPlayers = allDraftProspects.filter(
		p => p.draft.year === draftYear,
	);

	// Trigger randomDebutsForever?
	if (g.get("randomDebutsForever") !== undefined) {
		// Trigger condition - draftYear has no real players in it, or the year after draftYear has no real players in it
		const currentRealPlayers = existingPlayers.filter(p => p.real).length;
		const nextRealPlayers = allDraftProspects.filter(
			p => p.real && p.draft.year === draftYear + 1,
		).length;
		if (currentRealPlayers === 0 || nextRealPlayers === 0) {
			await realRosters.updateRandomDebutsForever(
				draftYear,
				currentRealPlayers,
			);
			return;
		}
	}

	const players = await genPlayersWithoutSaving(
		draftYear,
		scoutingRank,
		existingPlayers,
		forceScrubs,
	);

	for (const p of players) {
		await idb.cache.players.add(p);

		// idb.cache.players.add will create the "pid" property, transforming PlayerWithoutKey to Player
		// @ts-ignore
		await player.addRelatives(p);

		await player.updateValues(p);
	}

	// Easter eggs!
	if (isSport("basketball") && !forceScrubs) {
		if (Math.random() < 1 / 100000) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = draftYear - 48;
			p.born.loc = "Los Angeles, CA";
			p.college = "Washington State University";
			p.firstName = "LaVar";
			p.hgt = 78;
			p.imgURL = "/img/easter-eggs/lavar.jpg";
			p.lastName = "Ball";
			p.weight = 250;
			Object.assign(p.ratings[0], {
				hgt: 43,
				stre: 80,
				spd: 80,
				jmp: 80,
				endu: 80,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 80,
				oiq: 80,
				diq: 80,
				drb: 80,
				pss: 80,
				reb: 80,
			});
			await player.develop(p, 0);
			await player.updateValues(p);
			const pid = await idb.cache.players.add(p);

			if (typeof pid === "number") {
				await logEvent({
					type: "playerFeat",
					text: `<a href="${helpers.leagueUrl(["player", pid])}">${
						p.firstName
					} ${
						p.lastName
					}</a> got sick of the haters and decided to show the world how a big baller plays.`,
					showNotification: false,
					pids: [pid],
					tids: [g.get("userTid")],
				});
			}
			// eslint-disable-next-line no-dupe-else-if
		} else if (Math.random() < 1 / 100000) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = draftYear - 47;
			p.born.loc = "Honolulu, HI";
			p.college = "Columbia University";
			p.firstName = "Barack";
			p.hgt = 73;
			p.imgURL = "/img/obama.jpg";
			p.lastName = "Obama";
			p.weight = 175;
			Object.assign(p.ratings[0], {
				hgt: 20,
				stre: 80,
				spd: 80,
				jmp: 80,
				endu: 80,
				ins: 90,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 40,
				oiq: 80,
				diq: 80,
				drb: 90,
				pss: 80,
				reb: 100,
			});
			await player.develop(p, 0);
			await player.updateValues(p);
			p.ratings[0].skills = ["Dp"];
			const pid = await idb.cache.players.add(p);

			if (typeof pid === "number") {
				await logEvent({
					type: "playerFeat",
					text: `<a href="${helpers.leagueUrl(["player", pid])}">${
						p.firstName
					} ${
						p.lastName
					}</a> decided to bring hope and change to Basketball GM.`,
					showNotification: false,
					pids: [pid],
					tids: [g.get("userTid")],
				});
			}
			// eslint-disable-next-line no-dupe-else-if
		} else if (Math.random() < 1 / 100000) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = draftYear - 70;
			p.born.loc = "Queens, NY";
			p.college = "Wharton";
			p.firstName = "Donald";
			p.hgt = 75;
			p.imgURL = "/img/easter-eggs/trump.jpg";
			p.lastName = "Trump";
			p.weight = 240;
			Object.assign(p.ratings[0], {
				hgt: 40,
				stre: 80,
				spd: 80,
				jmp: 80,
				endu: 80,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 80,
				oiq: 80,
				diq: 100,
				drb: 80,
				pss: 0,
				reb: 80,
			});
			await player.develop(p, 0);
			await player.updateValues(p);
			p.ratings[0].skills = ["Dp"];
			const pid = await idb.cache.players.add(p);

			if (typeof pid === "number") {
				await logEvent({
					type: "playerFeat",
					text: `<a href="${helpers.leagueUrl(["player", pid])}">${
						p.firstName
					} ${p.lastName}</a> decided to Make Basketball GM Great Again.`,
					showNotification: false,
					pids: [pid],
					tids: [g.get("userTid")],
				});
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 14) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = draftYear - 75;
			p.born.loc = "Roman Empire";
			p.college = "";
			p.firstName = "Augustus";
			p.hgt = 69;
			p.imgURL = "/img/easter-eggs/augustus.jpg";
			p.lastName = "";
			p.weight = 180;
			Object.assign(p.ratings[0], {
				hgt: 11,
				stre: 80,
				spd: 80,
				jmp: 80,
				endu: 80,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 80,
				oiq: 80,
				diq: 80,
				drb: 80,
				pss: 80,
				reb: 80,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 188) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 169;
			p.born.loc = "China";
			p.college = "";
			p.firstName = "Dong";
			p.hgt = 60;
			p.imgURL = "/img/easter-eggs/zhuo.jpg";
			p.lastName = "Zhuo";
			p.weight = 250;
			Object.assign(p.ratings[0], {
				hgt: 0,
				stre: 65,
				spd: 80,
				jmp: 80,
				endu: 50,
				ins: 55,
				dnk: 70,
				ft: 80,
				fg: 60,
				tp: 60,
				oiq: 55,
				diq: 55,
				drb: 80,
				pss: 80,
				reb: 60,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 244) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 204;
			p.born.loc = "Roman Empire";
			p.college = "";
			p.firstName = "Philip";
			p.hgt = 69;
			p.imgURL = "/img/easter-eggs/philip.jpg";
			p.lastName = "The Arab";
			p.weight = 155;
			Object.assign(p.ratings[0], {
				hgt: 11,
				stre: 80,
				spd: 80,
				jmp: 80,
				endu: 80,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 60,
				oiq: 80,
				diq: 80,
				drb: 80,
				pss: 80,
				reb: 80,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 360) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 331;
			p.born.loc = "Roman Empire";
			p.college = "";
			p.firstName = "Julian";
			p.hgt = 64;
			p.imgURL = "/img/easter-eggs/julian.jpg";
			p.lastName = "The Apostate";
			p.weight = 130;
			Object.assign(p.ratings[0], {
				hgt: 0,
				stre: 80,
				spd: 80,
				jmp: 80,
				endu: 80,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 60,
				oiq: 80,
				diq: 80,
				drb: 90,
				pss: 80,
				reb: 80,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 433) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 406;
			p.born.loc = "Central Asia";
			p.college = "";
			p.firstName = "Attila";
			p.hgt = 59;
			p.imgURL = "/img/easter-eggs/atilla.jpg";
			p.lastName = "The Hun";
			p.weight = 120;
			Object.assign(p.ratings[0], {
				hgt: 0,
				stre: 100,
				spd: 100,
				jmp: 100,
				endu: 100,
				ins: 90,
				dnk: 90,
				ft: 80,
				fg: 80,
				tp: 50,
				oiq: 80,
				diq: 80,
				drb: 80,
				pss: 70,
				reb: 80,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 500) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = draftYear - 19;
			p.born.loc = "Great Britian";
			p.college = "";
			p.firstName = "King";
			p.hgt = 75;
			p.imgURL = "/img/easter-eggs/arthur.jpg";
			p.lastName = "Arthur";
			p.weight = 200;
			Object.assign(p.ratings[0], {
				hgt: 33,
				stre: 50,
				spd: 70,
				jmp: 75,
				endu: 50,
				ins: 50,
				dnk: 55,
				ft: 60,
				fg: 50,
				tp: 60,
				oiq: 50,
				diq: 50,
				drb: 80,
				pss: 91,
				reb: 65,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 907) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 852;
			p.born.loc = "China";
			p.college = "";
			p.firstName = "Zhu";
			p.hgt = 66;
			p.imgURL = "/img/easter-eggs/wen.jpg";
			p.lastName = "Wen";
			p.weight = 150;
			Object.assign(p.ratings[0], {
				hgt: 1,
				stre: 50,
				spd: 100,
				jmp: 90,
				endu: 75,
				ins: 60,
				dnk: 75,
				ft: 60,
				fg: 50,
				tp: 80,
				oiq: 85,
				diq: 75,
				drb: 80,
				pss: 90,
				reb: 70,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 989) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 970;
			p.born.loc = "Iceland";
			p.college = "";
			p.firstName = "Leif";
			p.hgt = 68;
			p.imgURL = "/img/easter-eggs/erikson.jpg";
			p.lastName = "Erikson";
			p.weight = 185;
			Object.assign(p.ratings[0], {
				hgt: 7,
				stre: 45,
				spd: 81,
				jmp: 98,
				endu: 70,
				ins: 71,
				dnk: 81,
				ft: 50,
				fg: 60,
				tp: 55,
				oiq: 54,
				diq: 51,
				drb: 80,
				pss: 71,
				reb: 61,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1206) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1162;
			p.born.loc = "Mongolia";
			p.college = "";
			p.firstName = "Genghis";
			p.hgt = 74;
			p.imgURL = "/img/easter-eggs/khan.jpg";
			p.lastName = "Khan";
			p.weight = 185;
			Object.assign(p.ratings[0], {
				hgt: 29,
				stre: 70,
				spd: 86,
				jmp: 86,
				endu: 86,
				ins: 90,
				dnk: 90,
				ft: 70,
				fg: 85,
				tp: 55,
				oiq: 90,
				diq: 40,
				drb: 70,
				pss: 70,
				reb: 70,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1573) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1564;
			p.born.loc = "England";
			p.college = "";
			p.firstName = "William";
			p.hgt = 70;
			p.imgURL = "/img/easter-eggs/shakespeare.jpg";
			p.lastName = "Shakespeare";
			p.weight = 170;
			Object.assign(p.ratings[0], {
				hgt: 16,
				stre: 45,
				spd: 85,
				jmp: 85,
				endu: 45,
				ins: 75,
				dnk: 75,
				ft: 70,
				fg: 55,
				tp: 55,
				oiq: 55,
				diq: 55,
				drb: 75,
				pss: 60,
				reb: 75,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1657) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1638;
			p.born.loc = "France";
			p.college = "";
			p.firstName = "King";
			p.hgt = 75;
			p.imgURL = "/img/easter-eggs/louis.jpg";
			p.lastName = "Louis XIV";
			p.weight = 195;
			Object.assign(p.ratings[0], {
				hgt: 33,
				stre: 30,
				spd: 70,
				jmp: 50,
				endu: 45,
				ins: 80,
				dnk: 80,
				ft: 70,
				fg: 55,
				tp: 65,
				oiq: 60,
				diq: 37,
				drb: 90,
				pss: 80,
				reb: 40,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1370) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1328;
			p.born.loc = "China";
			p.college = "";
			p.firstName = "Emperor";
			p.hgt = 64;
			p.imgURL = "/img/easter-eggs/yuanzhang.jpg";
			p.lastName = "Zhu Yuanzhang";
			p.weight = 300;
			Object.assign(p.ratings[0], {
				hgt: 0,
				stre: 80,
				spd: 80,
				jmp: 80,
				endu: 80,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 80,
				oiq: 80,
				diq: 80,
				drb: 100,
				pss: 100,
				reb: 80,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1431) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1412;
			p.born.loc = "France";
			p.college = "";
			p.firstName = "Joan of";
			p.hgt = 65;
			p.imgURL = "/img/easter-eggs/joan.jpg";
			p.lastName = "Arc";
			p.weight = 155;
			Object.assign(p.ratings[0], {
				hgt: 2,
				stre: 50,
				spd: 90,
				jmp: 90,
				endu: 50,
				ins: 60,
				dnk: 60,
				ft: 60,
				fg: 60,
				tp: 60,
				oiq: 50,
				diq: 50,
				drb: 80,
				pss: 80,
				reb: 50,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1789) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1732;
			p.born.loc = "USA";
			p.college = "";
			p.firstName = "George";
			p.hgt = 74;
			p.imgURL = "/img/easter-eggs/washington.jpg";
			p.lastName = "Washington";
			p.weight = 180;
			Object.assign(p.ratings[0], {
				hgt: 29,
				stre: 80,
				spd: 80,
				jmp: 80,
				endu: 80,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 65,
				oiq: 85,
				diq: 80,
				drb: 80,
				pss: 80,
				reb: 80,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1861) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1809;
			p.born.loc = "USA";
			p.college = "";
			p.firstName = "Abraham";
			p.hgt = 76;
			p.imgURL = "/img/easter-eggs/lincoln.jpg";
			p.lastName = "Lincoln";
			p.weight = 190;
			Object.assign(p.ratings[0], {
				hgt: 38,
				stre: 80,
				spd: 80,
				jmp: 90,
				endu: 80,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 60,
				oiq: 80,
				diq: 100,
				drb: 80,
				pss: 60,
				reb: 80,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1960) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1917;
			p.born.loc = "USA";
			p.college = "Harvard";
			p.firstName = "John";
			p.hgt = 72;
			p.imgURL = "/img/easter-eggs/kennedy.jpg";
			p.lastName = "Kennedy";
			p.weight = 160;
			Object.assign(p.ratings[0], {
				hgt: 16,
				stre: 70,
				spd: 70,
				jmp: 70,
				endu: 70,
				ins: 95,
				dnk: 95,
				ft: 95,
				fg: 85,
				tp: 70,
				oiq: 80,
				diq: 80,
				drb: 90,
				pss: 75,
				reb: 60,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		};
			if (Math.random() < 0.75) {
			if (draftYear === 1492) {
			const p = player.generate(
				PLAYER.UNDRAFTED,
				19,
				draftYear,
				false,
				scoutingRank,
			);
			p.born.year = 1451;
			p.born.loc = "Genoa";
			p.college = "";
			p.firstName = "Christopher";
			p.hgt = 68;
			p.imgURL = "/img/easter-eggs/columbus.jpg";
			p.lastName = "Columbus";
			p.weight = 155;
			Object.assign(p.ratings[0], {
				hgt: 8,
				stre: 75,
				spd: 75,
				jmp: 75,
				endu: 100,
				ins: 80,
				dnk: 80,
				ft: 80,
				fg: 80,
				tp: 70,
				oiq: 90,
				diq: 75,
				drb: 100,
				pss: 70,
				reb: 80,
			});
			await player.develop(p, 0);
			player.updateValues(p);
			const pid = await idb.cache.players.add(p);
			}
		}
	}
};

export default genPlayers;
