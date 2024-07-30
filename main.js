const { v1, auth, tools } = require("osu-api-extended");
const prompt = require("prompt-sync")();

const main = async () => {
  const ora = (await import("ora")).default;
  const API_KEY = process.env.API_KEY;
  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  const SCOPE_LIST = ["public"];

  auth.set_v1(API_KEY);
  const spinner = ora("Logging in...").start();

  try {
    await auth.login(CLIENT_ID, CLIENT_SECRET, SCOPE_LIST);
    spinner.succeed("Logged in successfully!");

    const userId = prompt("Enter the player Id or username: ");
    const sort = prompt(
      "Do you want to sort by recent or best? "
    ).toLowerCase();
    const validSorts = ["recent", "best"];

    if (!validSorts.includes(sort)) {
      console.log("Invalid sort option. Please enter 'recent' or 'best'.");
      return;
    }

    spinner.start("Fetching scores...");
    const data = await v1.user.scores.category(userId, sort, "osu", "id", 1);
    spinner.stop();

    if (!data || data.length === 0) {
      console.log("No scores found.");
      return;
    }

    const score = data[0];

    spinner.start("Fetching player details...");
    const player = await v1.user.details(userId);
    const map = await v1.beatmap.diff(score.beatmap);
    spinner.stop();

    spinner.start("Calculating PP if FC...");
    const ppFC = await tools.pp.calculate(
      score.beatmap,
      score.mods.id,
      map.difficulties[0].stats.combo,
      0,
      score.accuracy
    );
    spinner.stop();

    const starRating = await tools.pp.calculate(
      score.beatmap,
      score.mods.id,
      map.difficulties[0].stats.combo,
      0,
      score.accuracy
    );

    console.log(
      `${player.name} | ${map.metadata.artist.original} - ${map.metadata.title.original} [${map.difficulties[0].diff}] +${score.mods.name} ` +
        `(${map.metadata.creator.name}, ${starRating.stats.star.pure}*) ${score.accuracy}% ` +
        `${score.combo.max}/${map.difficulties[0].stats.combo}x ${score.hits["0"]}xMiss | ` +
        `${Math.round(score.pp)}pp | ${Math.round(ppFC.pp.current)}pp if FC`
    );
  } catch (error) {
    spinner.fail("An error occurred.");
    console.error(error);
  }
};

main();
