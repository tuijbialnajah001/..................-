import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://yande.re/post.json?limit=1");
    console.log(res.data[0]);
  } catch (e: any) {
    console.log(e.message);
  }
}
run();
