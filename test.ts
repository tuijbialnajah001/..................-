import axios from "axios";
(async () => {
    const res = await axios.get("http://localhost:3000/api/search?query=boobs&nsfw=true");
    console.log(res.data.posts.map((p: any) => p.tags).slice(0, 3));
})();
