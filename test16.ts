import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://booru.allthefallen.moe/posts.json?limit=1");
        console.log("ATFbooru:", res.data.length);
    } catch(e) {
        console.log("ATFbooru fail:", e.message);
    }
})();
