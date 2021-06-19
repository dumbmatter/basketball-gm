import useTitleBar from "../hooks/useTitleBar";
import type { View } from "../../common/types";
import TopStuff from "./Player/TopStuff";
import { getCols, helpers } from "../util";
import { DataTable, InjuryIcon } from "../components";
import { NoGamesMessage } from "./GameLog";

const PlayerGameLog = ({
	currentSeason,
	customMenu,
	freeAgent,
	godMode,
	injured,
	jerseyNumberInfos,
	numGamesPlayoffSeires,
	phase,
	player,
	retired,
	showContract,
	showRatings,
	showTradeFor,
	showTradingBlock,
	spectator,
	statSummary,
	teamColors,
	teamJersey,
	teamName,
	teamURL,
	willingToSign,
	gameLog,
	season,
	seasonsWithStats,
	stats,
	superCols,
}: View<"playerGameLog">) => {
	useTitleBar({
		title: player.name,
		customMenu,
		dropdownView: "player_game_log",
		dropdownFields: {
			playerProfile: "gameLog",
			seasons: season,
		},
		dropdownCustomOptions: {
			seasons: seasonsWithStats,
		},
		dropdownCustomURL: fields => {
			const parts =
				fields.playerProfile === "gameLog"
					? ["player_game_log", player.pid, fields.seasons]
					: ["player", player.pid];

			return helpers.leagueUrl(parts);
		},
	});

	const cols = getCols(
		"#",
		"Team",
		"Opp",
		"Result",
		"",
		...stats.map(stat => `stat:${stat}`),
	);

	const makeRow = (game: typeof gameLog[number], i: number) => {
		const oppAbbrevWithAway = `${game.away ? "@" : ""}${game.oppAbbrev}`;

		return {
			key: i,
			data: [
				i + 1,
				<a
					href={helpers.leagueUrl([
						"roster",
						`${game.abbrev}_${game.tid}`,
						season,
					])}
				>
					{game.abbrev}
				</a>,
				{
					value: (
						<a
							href={helpers.leagueUrl([
								"roster",
								`${game.oppAbbrev}_${game.oppTid}`,
								season,
							])}
						>
							{oppAbbrevWithAway}
						</a>
					),
					sortValue: game.oppAbbrev,
					searchValue: oppAbbrevWithAway,
				},
				{
					value: (
						<a
							href={helpers.leagueUrl([
								"game_log",
								game.tid < 0 ? "special" : `${game.abbrev}_${game.tid}`,
								season,
								game.gid,
							])}
						>
							{game.result}
						</a>
					),
					sortValue: game.diff,
					searchValue: game.result,
				},
				{
					value: <InjuryIcon className="ml-0" injury={game.injury} />,
					sortValue: game.injury.gamesRemaining,
					searchValue: game.injury.gamesRemaining,
					classNames: "text-center",
				},
				...stats.map(stat =>
					game.stats[stat] === undefined
						? undefined
						: helpers.roundStat(game.stats[stat], stat, true),
				),
			],
		};
	};

	const rowsRegularSeason = gameLog.filter(game => !game.playoffs).map(makeRow);

	const playoffGames = gameLog.filter(game => game.playoffs);
	const rowsPlayoffs = playoffGames.map(makeRow);

	// Add separators to playoff series when there is one more than a single game
	if (numGamesPlayoffSeires.some(numGames => numGames > 1)) {
		let prevOppTid;
		let oppTidCounter = -1;
		const classes = [
			"table-primary",
			"table-secondary",
			"table-success",
			"table-danger",
			"table-warning",
			"table-info",
			"table-light",
			"table-active",
		];
		for (let i = 0; i < playoffGames.length; i++) {
			const game = playoffGames[i];
			if (game.oppTid !== prevOppTid) {
				prevOppTid = game.oppTid;
				oppTidCounter += 1;
			}

			rowsPlayoffs[i].classNames = classes[oppTidCounter % classes.length];
		}
	}

	let noGamesMessage;
	if (gameLog.length === 0) {
		noGamesMessage = (
			<NoGamesMessage warnAboutDelete={season < currentSeason} />
		);
	}

	return (
		<>
			<TopStuff
				currentSeason={currentSeason}
				freeAgent={freeAgent}
				godMode={godMode}
				injured={injured}
				jerseyNumberInfos={jerseyNumberInfos}
				phase={phase}
				player={player}
				retired={retired}
				season={season}
				showContract={showContract}
				showRatings={showRatings}
				showTradeFor={showTradeFor}
				showTradingBlock={showTradingBlock}
				spectator={spectator}
				statSummary={statSummary}
				teamColors={teamColors}
				teamJersey={teamJersey}
				teamName={teamName}
				teamURL={teamURL}
				willingToSign={willingToSign}
			/>

			{noGamesMessage ? (
				noGamesMessage
			) : (
				<>
					{rowsRegularSeason.length > 0 ? (
						<>
							<DataTable
								cols={cols}
								defaultSort={[0, "asc"]}
								name="PlayerGameLog"
								rows={rowsRegularSeason}
								superCols={superCols}
							/>
						</>
					) : null}
					{rowsPlayoffs.length > 0 ? (
						<>
							<h2 className={rowsRegularSeason.length > 0 ? "mt-5" : undefined}>
								Playoffs
							</h2>
							<DataTable
								className="datatable-negative-margin-top"
								cols={cols}
								defaultSort={[0, "asc"]}
								name="PlayerGameLogPlayoffs"
								rows={rowsPlayoffs}
								superCols={superCols}
							/>
						</>
					) : null}
				</>
			)}
		</>
	);
};

export default PlayerGameLog;