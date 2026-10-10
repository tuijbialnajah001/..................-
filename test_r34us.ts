import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://rule34.us/index.php?page=dapi&s=post&q=index&json=1&limit=2");
    console.log("rule34.us:", res.data ? "success" : "failed");
  } catch (e: any) {
    console.log("rule34.us err:", e.message);
  }
}
run();
