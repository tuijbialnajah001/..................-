import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://danbooru.donmai.us/posts.json", {
      params: {
        tags: '1girl solo rating:e',
        limit: 10
      }
    });
    console.log(res.data.length);
  } catch (e: any) {
    console.log(e.message, e.response?.data);
  }
}
run();
