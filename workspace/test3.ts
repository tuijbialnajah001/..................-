import axios from 'axios';

async function run() {
  try {
    const res = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=5", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("data length:", res.data?.length || res.data?.post?.length);
  } catch (e: any) {
    console.log("error:", e.message);
  }
}
run();
