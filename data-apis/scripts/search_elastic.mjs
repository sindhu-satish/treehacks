// test
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Client as ElasticClient } from "@elastic/elasticsearch";

const es = new ElasticClient({
  node: process.env.ELASTIC_URL,
  auth: { apiKey: process.env.ELASTIC_API_KEY },
});

const index = process.env.ELASTIC_INDEX || "recipes_v1";
const q = process.argv.slice(2).join(" ") || "lentil";

const resp = await es.search({
  index,
  size: 5,
  query: {
    multi_match: {
      query: q,
      fields: ["recipe_name^3", "ingredients_text"],
    },
  },
});

console.log(
  resp.hits.hits.map((h) => ({
    id: h._id,
    score: h._score,
    recipe_name: h._source.recipe_name,
  }))
);
