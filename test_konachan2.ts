import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://konachan.com/post.json?limit=2", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("konachan.com:", res.data.length);
  } catch (e: any) {
    console.log("konachan.com err:", e.message);
  }
}
run();
