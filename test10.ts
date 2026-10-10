import axios from "axios";
(async () => {
    try {
        const res = await axios.get("http://localhost:3000/api/search?query=boobs&nsfw=true");
        console.log("Found:", res.data.posts.length);
        console.log("First tags:", res.data.posts[0]?.tags);
    } catch(e){}
})();
