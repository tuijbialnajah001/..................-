import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://danbooru.donmai.us/posts.json", {
      params: {
        tags: 'waifu rating:explicit',
        limit: 2
      }
    });
    console.log("danbooru:", res.data.length);
  } catch (e: any) {
    console.log("danbooru err:", e.message);
  }
}
run();
