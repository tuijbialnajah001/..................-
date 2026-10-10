import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://konachan.com/post.json?limit=2");
    console.log("konachan:", typeof res.data, Array.isArray(res.data) ? res.data.length : res.data);
    if(Array.isArray(res.data)) {
        console.log(res.data[0].file_url);
    }
  } catch (e: any) {
    console.log("konachan err:", e.message);
  }
}
run();
