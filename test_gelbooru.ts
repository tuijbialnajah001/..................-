import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=2");
    console.log("gelbooru:", typeof res.data, res.data.post ? res.data.post.length : "no post");
  } catch (e: any) {
    console.log("gelbooru err:", e.message);
  }
}
run();
