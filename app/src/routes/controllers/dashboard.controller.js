function setStats(allGames) {
    let totalWins, currWinStreak, longestWinStreak, totalGoals;
    totalWins = currWinStreak = longestWinStreak = totalGoals = 0;
    const gamesPerDay = {};
    const dailyWins = {};
    for (const game of allGames) {
        const date = game.created_at.split(" ")[0];
        gamesPerDay[date] = (gamesPerDay[date] || 0) + 1;
        if (!dailyWins[date])
            dailyWins[date] = { wins: 0, total: 0 };
        dailyWins[date].total += 1;
        if (game.current_is_winner) {
            totalWins++;
            currWinStreak++;
            totalGoals += game.winner === game.id_player1 ? game.score_player_1 : game.score_player_2;
            dailyWins[date].wins += 1;
        }
        else {
            if (currWinStreak > longestWinStreak)
                longestWinStreak = currWinStreak;
            currWinStreak = 0;
            totalGoals += !(game.winner === game.id_player1) ? game.score_player_1 : game.score_player_2;
        }
    }
    if (currWinStreak > longestWinStreak)
        longestWinStreak = currWinStreak;
    const winRateOverTime = Object.entries(dailyWins)
        .map(([date, { wins, total }]) => ({
        date,
        winRate: parseFloat(((wins * 100) / total).toFixed(2)),
    }))
        .sort((a, b) => a.date.localeCompare(b.date));
    const stats = {
        totalGames: allGames.length,
        winRate: (totalWins * 100) / allGames.length,
        currentWinStreak: currWinStreak,
        longestWinStreak: longestWinStreak,
        totalGoalsScored: totalGoals,
        gamesPerDay: gamesPerDay,
        winRateOverTime: winRateOverTime
    };
    return (stats);
}
// GET /api/dashboard/stats
export function getStats(fastify) {
    return async function (request, reply) {
        try {
            const currentUserId = request.session.userId;
            const allGames = await fastify.database.fetch_all(`SELECT
				m.id AS game_id,
				m.player_1 AS id_player1,
				m.player_2 AS id_player2,
				m.score_player_1,
				m.score_player_2,
				m.winner,
				m.date AS created_at,
				u1.username AS username_player1,
				u2.username AS username_player2,
				  CASE WHEN m.winner = ? THEN 1 ELSE 0 END AS current_is_winner
				FROM match m
				INNER JOIN user u1 ON m.player_1 = u1.id
				INNER JOIN user u2 ON m.player_2 = u2.id
				WHERE (m.player_1 = ? OR m.player_2 = ?)
				ORDER BY m.id ASC`, [currentUserId, currentUserId, currentUserId]);
            if (!allGames)
                return reply.status(404).send({ message: "No games played" });
            const stats = setStats(allGames);
            return (reply.send(stats));
        }
        catch (err) {
            console.error("Failed to fetch stats", err);
            reply.status(500).send({ error: "Database error" });
        }
    };
}
