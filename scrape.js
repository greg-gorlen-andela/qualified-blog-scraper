const {writeFile} = require("node:fs/promises");
const cheerio = require("cheerio"); // ^1.0.0-rc.12
const Papa = require("papaparse"); // ^5.4.1

const get = url =>
  fetch(url).then(res => {
    if (!res.ok) {
      throw Error(res.statusText);
    }

    return res.text();
  });

(async () => {
  const baseUrl = "https://www.qualified.io";
  const html = await get(baseUrl + "/blog");
  const $ = cheerio.load(html);
  const data = [];

  for (const e of [...$(".post")].slice(0, 3)) {
    const href = $(e)
      .find(":scope .post-card__image-link")
      .attr("href");
    const post = await get(baseUrl + href);
    data.push({
      date: $(e).find(".post-card__date").text(),
      name: $(e).find(".post-card__title").text(),
      slug: $(e)
        .find(".post-card__content-link")
        .attr("href")
        .split(/\//)
        .pop(),
      author: $(e).find(".post-card__author-name").text(),
      href: baseUrl + href,
      tag: $(e).find(".post-card__tags").text(),
      thumbnail: $(e).find(".post-card__image").attr("src"),
      length: $(e).find(".post-card__min-read").text(),
      excerpt: $(e).find(".post-card__excerpt .markdown").text(),
      content: cheerio.load(post)(".markdown, .richtext").html(),
    });
  }

  console.log(data);
  return writeFile("qualified-blog.json", JSON.stringify(data));
  return writeFile("qualified-blog.csv", Papa.unparse(data));
})().catch(err => console.error(err));
