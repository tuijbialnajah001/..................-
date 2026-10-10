import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://danbooru.donmai.us/posts.json?tags=breast_focus&limit=1", { headers: { 'User-Agent': 'AnimeVault/1.0' } });
        console.log("breast_focus danbooru:", res.data.length);
    } catch(e){}
    try {
        const res = await axios.get("https://danbooru.donmai.us/posts.json?tags=huge_breasts&limit=1", { headers: { 'User-Agent': 'AnimeVault/1.0' } });
        console.log("huge_breasts danbooru:", res.data.length);
    } catch(e){}
    try {
        const res = await axios.get("https://danbooru.donmai.us/posts.json?tags=cleavage&limit=1", { headers: { 'User-Agent': 'AnimeVault/1.0' } });
        console.log("cleavage danbooru:", res.data.length);
    } catch(e){}
})();
