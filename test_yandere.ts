import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://yande.re/post.json?limit=2");
    console.log("yande.re:", typeof res.data, Array.isArray(res.data) ? res.data.length : res.data);
  } catch (e: any) {
    console.log("yande.re err:", e.message);
  }
}
run();
