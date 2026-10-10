import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://danbooru.donmai.us/posts.json", {
      params: {
        tags: 'naruto sasuke rating:e',
        limit: 10
      }
    });
    console.log(res.data.length);
  } catch (e: any) {
    console.log(e.message, e.response?.data);
  }
}
run();
