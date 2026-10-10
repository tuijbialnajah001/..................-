import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://konachan.net/post.json?limit=2");
    console.log("konachan.net:", typeof res.data, Array.isArray(res.data) ? res.data.length : res.data);
  } catch (e: any) {
    console.log("konachan.net err:", e.message);
  }
}
run();
