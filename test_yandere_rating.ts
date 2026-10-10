import axios from 'axios';
async function run() {
  try {
    const res = await axios.get("https://yande.re/post.json", {
      params: {
        tags: 'rating:explicit',
        limit: 5
      }
    });
    console.log(res.data.length);
    console.log(res.data[0].rating);
  } catch (e: any) {
    console.log(e.message);
  }
}
run();
