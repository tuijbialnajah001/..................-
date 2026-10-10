import axios from 'axios';
async function run() {
  const res = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=2");
  console.log(res.data);
}
run();
