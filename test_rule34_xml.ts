import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=2");
    console.log("rule34 xml:", res.data.substring(0, 100));
  } catch (e: any) {
    console.log("rule34 xml err:", e.message);
  }
}
run();
