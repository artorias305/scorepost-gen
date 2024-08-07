const { v1, auth, tools } = require("osu-api-extended");
require("dotenv").config();
const { select, text, intro, outro, spinner } = require("@clack/prompts");

const main = async () => {
  const API_KEY = process.env.API_KEY;
  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  const SCOPE_LIST = ["public"];

  auth.set_v1(API_KEY);
  intro(`Welcome to Artorias's scorepost generator!`);
  const s = spinner();
  s.start(`Loggin in...`);

  try {
    await auth.login(CLIENT_ID, CLIENT_SECRET, SCOPE_LIST);
    s.stop(`Logged in successfully.`);

    const userId = await text({
      message: "Enter the player ID or username",
      validate(value) {
        if (value.length === 0) return `Please enter a valid ID or username`;
      },
    });
    const sort = await select({
      message: "Do you want to sort by:",
      options: [
        { value: "recent", label: "Most Recent Score" },
        { value: "best", label: "Top Play" },
      ],
    });

    s.start("Fetching scores...");
    const data = await v1.user.scores.category(userId, sort, "osu", "id", 1);
    s.stop();

    if (!data || data.length === 0) {
      console.log("No scores found.");
      return;
    }

    const score = data[0];

    s.start("Fetching player and map details...");
    const player = await v1.user.details(userId);
    const map = await v1.beatmap.diff(score.beatmap);
    s.stop();

    s.start("Calculating PP if FC...");
    const ppFC = await tools.pp.calculate(
      score.beatmap,
      score.mods.id,
      map.difficulties[0].stats.combo,
      0,
      score.accuracy
    );
    s.stop();

    const starRating = await tools.pp.calculate(
      score.beatmap,
      score.mods.id,
      map.difficulties[0].stats.combo,
      0,
      score.accuracy
    );

    outro(
      `${player.name} | ${map.metadata.artist.original} - ${map.metadata.title.original} [${map.difficulties[0].diff}] +${score.mods.name} ` +
        `(${map.metadata.creator.name}, ${starRating.stats.star.pure}*) ${score.accuracy}% ` +
        `${score.combo.max}/${map.difficulties[0].stats.combo}x ` +
        `${score.hits["0"] === 0 ? "FC" : `${score.hits["0"]}xMiss`} | ` +
        `${Math.round(isNaN(score.pp) ? 0 : score.pp)}pp ${
          score.hits["0"] === 0
            ? ""
            : `| ${Math.round(ppFC.pp.current)}pp if FC`
        }`
    );
  } catch (error) {
    console.error(error);
  }
};

main();
