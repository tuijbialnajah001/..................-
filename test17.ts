import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://booru.allthefallen.moe/posts.json?limit=1");
        console.log("ATFbooru:", typeof res.data, Array.isArray(res.data));
    } catch(e) {}
})();
