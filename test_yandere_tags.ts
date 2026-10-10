import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://yande.re/post.json", {
      params: {
        tags: 'naruto rating:explicit',
        limit: 5
      }
    });
    console.log(res.data.length);
  } catch (e: any) {
    console.log(e.message);
  }
}
run();
