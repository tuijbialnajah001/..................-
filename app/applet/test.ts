import axios from 'axios';

async function run() {
  try {
    const res = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=5");
    console.log("Rule34 data size:", res.data?.length);
  } catch (e: any) {
    console.log("Rule34 error:", e.message);
  }

  try {
    const res = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=5");
    console.log("Gelbooru data size:", res.data?.post?.length);
  } catch (e: any) {
    console.log("Gelbooru error:", e.message);
  }
}
run();
