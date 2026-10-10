import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://konachan.net/post.json?limit=2");
    console.log("konachan.net data:", res.data[0]);
  } catch (e: any) {
    console.log("konachan.net err:", e.message);
  }
}
run();
