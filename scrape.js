const {writeFile} = require("node:fs/promises");
const cheerio = require("cheerio"); // ^1.0.0-rc.12
const Papa = require("papaparse"); // ^5.4.1

const ua =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const get = url =>
  fetch(url, {headers: {"User-Agent": ua}})
  .then(res => {
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

  for (const e of [...$(".post")]) {
    const href = $(e)
      .find(":scope .post-card__image-link")
      .attr("href");
    const postHTML = await get(baseUrl + href);
    const preliminaryRow = {
      prettyDate: $(e).find(".post-card__date").text(),
      title: $(e).find(".post-card__title").text(),
      href: baseUrl + href,
      thumbnail: $(e).find(".post-card__image").attr("src"),
      length: $(e).find(".post-card__min-read").text(),
      excerpt: $(e).find(".post-card__excerpt .markdown").text(),
      collection: $(e).find(".post-card__tags").text(),
      slug: $(e)
        .find(".post-card__content-link")
        .attr("href")
        .split(/\//)
        .pop(),
      author: $(e).find(".post-card__author-name").text(),
      href: baseUrl + href,
      htmlContent: cheerio
        .load(postHTML)(".markdown, .richtext")
        .html(),
    };
    const match = postHTML.match(
      /__INITIAL_STATE__=(.*);\(function/
    )?.[1];

    if (!match) {
      // For some reason, one post doesn't have a
      // data payload, so scrape the document
      data.push({
        ...preliminaryRow,
        tags: null,
        body: null,
        richBody: null,
        description: null,
        hideHero: null,
        publishDate: new Date(
          preliminaryRow.prettyDate
        ).toISOString(),
      });
      // console.log(data)
      continue;
    }

    const {
      data: {post},
    } = JSON.parse(match);
    console.log(JSON.stringify(post, null, 2));
    const row = {
      ...preliminaryRow,
      ...post,
      richBody: post.richBody
        ? JSON.stringify(post.richBody)
        : null,
      author: post.author?.name,
      collection: post.collection.title,
      tags: post.tags.join(";") || null,
      heroImage: post.file,
      parent: undefined,
      prev: undefined,
      next: undefined,
    };
    delete row.parent;
    delete row.prev;
    delete row.next;
    data.push(row);
  }

  // console.log(data);
  await writeFile("qualified-blog.json", JSON.stringify(data));
  await writeFile("qualified-blog.csv", Papa.unparse(data));
})().catch(err => console.error(err));
